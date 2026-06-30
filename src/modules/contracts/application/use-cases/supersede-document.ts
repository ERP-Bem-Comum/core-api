/**
 * supersedeDocument — use case que substitui um ContractDocument Active por
 * uma nova versao (RN-AS-02).
 *
 * Ticket: CTR-USECASE-SUPERSEDE-DOCUMENT.
 *
 * Sequencia canonica:
 *   1. Validar documentId, supersededByDocumentId, supersededBy
 *   2. documentRepo.findById(documentId) -> null = 'document-not-found'
 *   3. documentRepo.findById(supersededByDocumentId) -> null = 'supersede-target-not-found'
 *   4. Switch sobre status:
 *      - 'Active' -> seguir
 *      - 'LogicallyDeleted' -> 'document-already-deleted'
 *      - 'Superseded' -> 'document-already-superseded'
 *   5. Document.supersede(active, byDocId, by, clock.now())
 *      (propaga 'document-supersede-self' se byDocId === doc.id)
 *   6. documentRepo.save(superseded, [event])
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
import type { SupersededContractDocument } from '../../domain/document/types.ts';
import type { ContractDocumentSupersededEvent } from '../../domain/document/events.ts';
import type { ContractDocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';

// ─── command + output ────────────────────────────────────────────────────────

export type SupersedeDocumentCommand = Readonly<{
  documentId: string;
  supersededByDocumentId: string;
  supersededBy: string;
}>;

export type SupersedeDocumentOutput = Readonly<{
  document: SupersededContractDocument;
  event: ContractDocumentSupersededEvent;
}>;

export type SupersedeDocumentError =
  | DocumentIdError
  | UserRefError
  | 'document-not-found'
  | 'supersede-target-not-found'
  | 'document-already-deleted'
  | 'document-already-superseded'
  | ContractDocumentError
  | DocumentRepositoryError;

// ─── deps ────────────────────────────────────────────────────────────────────

export type SupersedeDocumentDeps = Readonly<{
  clock: Clock;
  documentRepo: DocumentRepository;
}>;

// ─── use case ────────────────────────────────────────────────────────────────

export const supersedeDocument =
  (deps: SupersedeDocumentDeps) =>
  async (
    cmd: SupersedeDocumentCommand,
  ): Promise<Result<SupersedeDocumentOutput, SupersedeDocumentError>> => {
    const docIdR = DocumentId.rehydrate(cmd.documentId);
    if (!docIdR.ok) return err(docIdR.error);

    const byDocIdR = DocumentId.rehydrate(cmd.supersededByDocumentId);
    if (!byDocIdR.ok) return err(byDocIdR.error);

    const userR = UserRef.rehydrate(cmd.supersededBy);
    if (!userR.ok) return err(userR.error);

    const loadR = await deps.documentRepo.findById(docIdR.value);
    if (!loadR.ok) return err(loadR.error);
    if (loadR.value === null) return err('document-not-found');

    const targetR = await deps.documentRepo.findById(byDocIdR.value);
    if (!targetR.ok) return err(targetR.error);
    if (targetR.value === null) return err('supersede-target-not-found');

    const doc = loadR.value;
    switch (doc.status) {
      case 'Active':
        break;
      case 'LogicallyDeleted':
        return err('document-already-deleted');
      case 'Superseded':
        return err('document-already-superseded');
    }

    const supersedeR = Document.supersede(doc, byDocIdR.value, userR.value, deps.clock.now());
    if (!supersedeR.ok) return err(supersedeR.error);

    const saveR = await deps.documentRepo.save(supersedeR.value.document, [supersedeR.value.event]);
    if (!saveR.ok) return err(saveR.error);

    return ok({ document: supersedeR.value.document, event: supersedeR.value.event });
  };
