import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type { FinancialOutbox, OutboxAppendError } from '../ports/outbox.ts';

export type CancelDocumentDeps = Readonly<{ repo: DocumentRepository; outbox: FinancialOutbox }>;
export type CancelDocumentCommand = Readonly<{ documentId: string }>;
export type CancelDocumentError =
  | DocumentError
  | DocumentRepositoryError
  | OutboxAppendError
  | DocumentId.DocumentIdError;

export const cancelDocument =
  (deps: CancelDocumentDeps) =>
  async (cmd: CancelDocumentCommand): Promise<Result<void, CancelDocumentError>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(id.error);

    const found = await deps.repo.findById(id.value);
    if (!found.ok) return err(found.error);

    const open = Document.parseOpen(found.value.document);
    if (!open.ok) return err(open.error);
    if (found.value.payables === null) return err('document-repository-failure');

    const cancelled = Document.cancel({ document: open.value, payables: found.value.payables });
    if (!cancelled.ok) return err(cancelled.error);

    const deleted = await deps.repo.delete(id.value);
    if (!deleted.ok) return err(deleted.error);

    const published = await deps.outbox.append(cancelled.value.events);
    if (!published.ok) return err(published.error);

    return ok(undefined);
  };
