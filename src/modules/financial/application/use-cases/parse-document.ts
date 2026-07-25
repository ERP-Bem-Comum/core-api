import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { DocumentReaderPort } from '../ports/document-reader.ts';
import type { DocumentReaderError } from '../../domain/document-reader/errors.ts';
import type { DocumentReaderResult, SupplierIdentity } from '../../domain/document-reader/types.ts';
import { READER_ERROR_CLASS, type ResolveSupplierByCnpj } from './ingest-document.ts';

// #580: leitura PURA (parse-only) — roda o MESMO leitor da ingestão e devolve os campos extraídos
// (incl. `supplierRef` casado por CNPJ), SEM criar rascunho nem persistir nada. Restaura o auto-fill
// do fornecedor no upload (que caiu quando o upload deixou de criar rascunho — decisão P.O.), para
// TODOS os layouts que o leitor do backend cobre. Sem storage, sem repo: é o ingest sem efeitos.
export type ParseDocumentDeps = Readonly<{
  reader: DocumentReaderPort;
  resolveSupplierByCnpj?: ResolveSupplierByCnpj;
}>;

export type ParseDocumentCommand = Readonly<{
  bytes: Uint8Array;
  mimeType: string;
}>;

export type ParseDocumentOutput = Readonly<{
  resolvedVia: 'xml' | 'native-text' | 'unpdf' | null;
  // Fornecedor CADASTRADO casado pelo CNPJ do emitente (null = sem match / sem partners / erro).
  supplierRef: string | null;
  // Identidade lida do documento (razão + CNPJ) — útil ao front mesmo sem match cadastral.
  supplier: SupplierIdentity | null;
  // Campos crus extraídos pelo leitor (null quando a leitura falhou como 'read' — front não preenche).
  result: DocumentReaderResult | null;
}>;

export type ParseDocumentError = DocumentReaderError;

export const parseDocument =
  (deps: ParseDocumentDeps) =>
  async (
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- bytes: Uint8Array sem variant readonly no TS 6
    cmd: ParseDocumentCommand,
  ): Promise<Result<ParseDocumentOutput, ParseDocumentError>> => {
    const read = await deps.reader.read({ bytes: cmd.bytes, declaredMime: cmd.mimeType });
    // RECURSO (vazio/grande demais/bomba) → rejeita; LEITURA (scanned/malformed) → 200 sem campos.
    if (!read.ok && READER_ERROR_CLASS[read.error] === 'resource') return err(read.error);
    const result = read.ok ? read.value : null;

    // Resolve o CNPJ do emitente → fornecedor cadastrado (gracioso: sem match/erro → null).
    let supplierRef: string | null = null;
    const taxId = result?.supplier?.taxId;
    if (taxId !== undefined && deps.resolveSupplierByCnpj !== undefined) {
      const resolved = await deps.resolveSupplierByCnpj(taxId);
      if (resolved.ok && resolved.value !== null) supplierRef = resolved.value;
    }

    return ok({
      resolvedVia: result?.resolvedVia ?? null,
      supplierRef,
      supplier: result?.supplier ?? null,
      result,
    });
  };
