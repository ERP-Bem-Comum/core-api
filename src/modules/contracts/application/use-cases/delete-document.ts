/**
 * deleteDocument — use case que orquestra exclusao logica do agregado
 * ContractDocument (RN-11).
 *
 * Ticket: CTR-USECASE-DELETE-DOCUMENT.
 *
 * Sequencia canonica:
 *   1. Validar documentId via DocumentId.rehydrate
 *   2. Validar deletedBy via UserRef.rehydrate
 *   3. documentRepo.findById -> null = 'document-not-found'
 *   4. Switch sobre status:
 *      - 'Active' -> seguir
 *      - 'LogicallyDeleted' -> 'document-already-deleted'
 *      - 'Superseded' -> 'document-already-superseded'
 *   5. Document.logicallyDelete(active, reason, by, clock.now())
 *   6. documentRepo.save(deleted, [event]) (outbox via repo)
 *
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import type { DocumentIdError } from '../../domain/shared/document-id.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import type { UserRefError } from '../../../../shared/kernel/user-ref.ts';
import * as Document from '../../domain/document/document.ts';
import type { LogicallyDeletedContractDocument } from '../../domain/document/types.ts';
import type { ContractDocumentDeletedEvent } from '../../domain/document/events.ts';
import type { ContractDocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';

// ─── command + output ────────────────────────────────────────────────────────

export type DeleteDocumentCommand = Readonly<{
  documentId: string;
  deletedReason: string;
  deletedBy: string;
}>;

export type DeleteDocumentOutput = Readonly<{
  document: LogicallyDeletedContractDocument;
  event: ContractDocumentDeletedEvent;
}>;

export type DeleteDocumentError =
  | DocumentIdError
  | UserRefError
  | 'document-not-found'
  | 'document-already-deleted'
  | 'document-already-superseded'
  | ContractDocumentError
  | DocumentRepositoryError;

// ─── deps ────────────────────────────────────────────────────────────────────

export type DeleteDocumentDeps = Readonly<{
  clock: Clock;
  documentRepo: DocumentRepository;
}>;

// ─── use case ────────────────────────────────────────────────────────────────

export const deleteDocument =
  (deps: DeleteDocumentDeps) =>
  async (
    cmd: DeleteDocumentCommand,
  ): Promise<Result<DeleteDocumentOutput, DeleteDocumentError>> => {
    const docIdR = DocumentId.rehydrate(cmd.documentId);
    if (!docIdR.ok) return err(docIdR.error);

    const userR = UserRef.rehydrate(cmd.deletedBy);
    if (!userR.ok) return err(userR.error);

    const loadR = await deps.documentRepo.findById(docIdR.value);
    if (!loadR.ok) return err(loadR.error);
    if (loadR.value === null) return err('document-not-found');

    const doc = loadR.value;
    switch (doc.status) {
      case 'Active':
        break;
      case 'LogicallyDeleted':
        return err('document-already-deleted');
      case 'Superseded':
        return err('document-already-superseded');
    }

    const deleteR = Document.logicallyDelete(doc, cmd.deletedReason, userR.value, deps.clock.now());
    if (!deleteR.ok) return err(deleteR.error);

    const saveR = await deps.documentRepo.save(deleteR.value.document, [deleteR.value.event]);
    if (!saveR.ok) return err(saveR.error);

    return ok({ document: deleteR.value.document, event: deleteR.value.event });
  };
