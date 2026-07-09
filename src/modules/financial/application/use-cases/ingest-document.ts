import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { DocumentReaderPort } from '../ports/document-reader.ts';
import type { DocumentReaderError } from '../../domain/document-reader/errors.ts';
import type {
  SourceFileStoragePort,
  SourceFileStorageError,
} from '../ports/source-file-storage.ts';
import type { SourceFileRef } from '../../domain/document/source-file-ref.ts';
import type { DocumentId } from '../../domain/shared/document-id.ts';
import { readerResultToDraft } from '../document-reader-to-draft.ts';
import type { SaveDraftCommand, SaveDraftOutput, SaveDraftError } from './save-draft.ts';

// Ingestão de documento (#62, fatia 2): lê o PDF/XML, guarda o comprovante-fonte e cria um rascunho
// pré-preenchido — o humano confere/submete (o motor nunca confirma sozinho, #62 CA4).
export type IngestDocumentDeps = Readonly<{
  reader: DocumentReaderPort;
  storage: SourceFileStoragePort;
  saveDraft: (cmd: SaveDraftCommand) => Promise<Result<SaveDraftOutput, SaveDraftError>>;
  idGen: () => DocumentId;
}>;

export type IngestDocumentCommand = Readonly<{
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  uploadedBy: string;
}>;

export type IngestDocumentOutput = Readonly<{
  documentId: DocumentId;
  resolvedVia: 'xml' | 'native-text' | null;
  sourceFile: SourceFileRef;
}>;

export type IngestDocumentError = DocumentReaderError | SourceFileStorageError | SaveDraftError;

// Erros de RECURSO do reader = rejeição total (não guarda nada). Erros de LEITURA (escaneado/
// não-suportado/malformado) NÃO abortam: guarda o PDF e cria rascunho vazio p/ preenchimento manual.
const RESOURCE_ERRORS: readonly DocumentReaderError[] = [
  'decompression-limit-exceeded',
  'source-too-large',
  'empty-input',
];

export const ingestDocument =
  (deps: IngestDocumentDeps) =>
  async (
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- bytes: Uint8Array sem variant readonly no TS 6
    cmd: IngestDocumentCommand,
  ): Promise<Result<IngestDocumentOutput, IngestDocumentError>> => {
    const documentId = deps.idGen();

    const read = await deps.reader.read({ bytes: cmd.bytes, declaredMime: cmd.mimeType });
    if (!read.ok && RESOURCE_ERRORS.includes(read.error)) return err(read.error);
    const readResult = read.ok ? read.value : null;

    const stored = await deps.storage.upload({
      documentId,
      bytes: cmd.bytes,
      mimeType: cmd.mimeType,
      fileName: cmd.fileName,
    });
    if (!stored.ok) return err(stored.error);

    const draftFields = readResult !== null ? readerResultToDraft(readResult) : {};
    const saved = await deps.saveDraft({
      id: documentId,
      ...draftFields,
      sourceFile: {
        bucket: stored.value.bucket,
        key: stored.value.key,
        hashSha256: stored.value.hashSha256,
        sizeBytes: stored.value.sizeBytes,
        mimeType: stored.value.mimeType,
      },
    });
    if (!saved.ok) return err(saved.error);

    return ok({
      documentId,
      resolvedVia: readResult?.resolvedVia ?? null,
      sourceFile: stored.value,
    });
  };
