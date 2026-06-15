import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type { FinancialOutbox, OutboxAppendError } from '../ports/outbox.ts';

export type UndoApprovalDeps = Readonly<{ repo: DocumentRepository; outbox: FinancialOutbox }>;
export type UndoApprovalCommand = Readonly<{ documentId: string }>;
export type UndoApprovalError =
  | DocumentError
  | DocumentRepositoryError
  | OutboxAppendError
  | DocumentId.DocumentIdError;

export const undoApproval =
  (deps: UndoApprovalDeps) =>
  async (cmd: UndoApprovalCommand): Promise<Result<void, UndoApprovalError>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(id.error);

    const found = await deps.repo.findById(id.value);
    if (!found.ok) return err(found.error);

    const approved = Document.parseApproved(found.value.document);
    if (!approved.ok) return err(approved.error);
    if (found.value.payables === null) return err('document-repository-failure');

    const undone = Document.undoApproval({
      document: approved.value,
      payables: found.value.payables,
    });
    if (!undone.ok) return err(undone.error);

    const saved = await deps.repo.save({
      document: undone.value.document,
      payables: undone.value.payables,
    });
    if (!saved.ok) return err(saved.error);

    const published = await deps.outbox.append(undone.value.events);
    if (!published.ok) return err(published.error);

    return ok(undefined);
  };
