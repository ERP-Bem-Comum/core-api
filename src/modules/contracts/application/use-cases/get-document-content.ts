/**
 * getDocumentContent — use case que devolve o conteúdo (bytes) de um documento
 * anexado, com verificação de OWNERSHIP (o documento deve pertencer ao contrato
 * `:id`, diretamente ou via aditivo daquele contrato).
 *
 * Ticket: CTR-HTTP-DOCUMENT-CONTENT (W1).
 *
 * Sequência canônica (validar → fetch → ownership → fetch storage):
 *   1. Validar contractId (ContractId.rehydrate) e documentId (DocumentId.rehydrate)
 *   2. documentRepo.findById -> null = 'document-not-found'
 *   3. Ownership:
 *      - parentType 'Contract'  -> parentId === contractId? senão 'document-not-owned'
 *      - parentType 'Amendment' -> carrega aditivo; aditivo.contractId === contractId?
 *        senão 'document-not-owned'. Aditivo inexistente -> 'document-not-found'.
 *   4. storage.getContent({ bucket, key: storageKey }) -> bytes
 *   5. ok({ bytes, fileName, contentType })
 *
 * `document-not-owned` é deliberadamente tratado como negação fail-closed: a
 * borda HTTP mapeia para 404 (não vaza existência do documento alheio).
 *
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import type { ContractIdError } from '../../domain/shared/contract-id.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import type { DocumentIdError } from '../../domain/shared/document-id.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type {
  AmendmentRepository,
  AmendmentRepositoryError,
} from '../../domain/amendment/repository.ts';
import type { DocumentStorage, DocumentStorageError } from '../ports/document-storage.ts';

// ─── command + output ────────────────────────────────────────────────────────

export type GetDocumentContentCommand = Readonly<{
  contractId: string;
  documentId: string;
}>;

export type GetDocumentContentOutput = Readonly<{
  bytes: Buffer;
  fileName: string;
  contentType: string;
}>;

export type GetDocumentContentError =
  | ContractIdError
  | DocumentIdError
  | 'document-not-found'
  | 'document-not-owned'
  | DocumentRepositoryError
  | AmendmentRepositoryError
  | DocumentStorageError;

// ─── deps ────────────────────────────────────────────────────────────────────

export type GetDocumentContentDeps = Readonly<{
  documentRepo: DocumentRepository;
  amendmentRepo: AmendmentRepository;
  storage: DocumentStorage;
}>;

// ─── use case ────────────────────────────────────────────────────────────────

export const getDocumentContent =
  (deps: GetDocumentContentDeps) =>
  async (
    cmd: GetDocumentContentCommand,
  ): Promise<Result<GetDocumentContentOutput, GetDocumentContentError>> => {
    const contractIdR = ContractId.rehydrate(cmd.contractId);
    if (!contractIdR.ok) return err(contractIdR.error);

    const docIdR = DocumentId.rehydrate(cmd.documentId);
    if (!docIdR.ok) return err(docIdR.error);

    const loadR = await deps.documentRepo.findById(docIdR.value);
    if (!loadR.ok) return err(loadR.error);
    if (loadR.value === null) return err('document-not-found');

    const doc = loadR.value;

    // Ownership (IDOR/BOLA): o documento deve pertencer ao contrato `:id` —
    // diretamente (parentType Contract) ou via aditivo daquele contrato (Amendment).
    switch (doc.parentType) {
      case 'Contract':
        if (String(doc.parentId) !== String(contractIdR.value)) {
          return err('document-not-owned');
        }
        break;
      case 'Amendment': {
        // `parentId` de um documento de aditivo é um `AmendmentId` (branded). O
        // union `ContractId | AmendmentId` não estreita por `parentType`
        // (campos independentes), daí o cast — seguro pela invariante do agregado
        // (parentType 'Amendment' ⇒ parentId é AmendmentId).
        const amendmentId = doc.parentId as Parameters<AmendmentRepository['findById']>[0];
        const amendmentR = await deps.amendmentRepo.findById(amendmentId);
        if (!amendmentR.ok) return err(amendmentR.error);
        if (amendmentR.value === null) return err('document-not-found');
        if (String(amendmentR.value.contractId) !== String(contractIdR.value)) {
          return err('document-not-owned');
        }
        break;
      }
    }

    const contentR = await deps.storage.getContent({ bucket: doc.bucket, key: doc.storageKey });
    if (!contentR.ok) return err(contentR.error);

    return ok({
      bytes: contentR.value.bytes,
      fileName: doc.fileName,
      contentType: doc.mimeType,
    });
  };
