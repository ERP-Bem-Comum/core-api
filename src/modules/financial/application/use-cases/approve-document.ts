import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type { FinancialOutbox, OutboxAppendError } from '../ports/outbox.ts';

export type ApproveDocumentDeps = Readonly<{
  repo: DocumentRepository;
  outbox: FinancialOutbox;
  clock: Clock;
}>;

export type ApproveDocumentCommand = Readonly<{ documentId: string; approvedBy: string }>;

export type ApproveDocumentError =
  | DocumentError
  | DocumentRepositoryError
  | OutboxAppendError
  | DocumentId.DocumentIdError
  | UserRef.UserRefError;

export const approveDocument =
  (deps: ApproveDocumentDeps) =>
  async (cmd: ApproveDocumentCommand): Promise<Result<void, ApproveDocumentError>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(id.error);
    const by = UserRef.rehydrate(cmd.approvedBy);
    if (!by.ok) return err(by.error);

    const found = await deps.repo.findById(id.value);
    if (!found.ok) return err(found.error);

    const open = Document.parseOpen(found.value.document);
    if (!open.ok) return err(open.error);
    if (found.value.payables === null) return err('document-repository-failure');

    const approved = Document.approve({
      document: open.value,
      payables: found.value.payables,
      by: by.value,
      at: deps.clock.now(),
    });
    if (!approved.ok) return err(approved.error);

    const saved = await deps.repo.save({
      document: approved.value.document,
      payables: approved.value.payables,
    });
    if (!saved.ok) return err(saved.error);

    const published = await deps.outbox.append(approved.value.events);
    if (!published.ok) return err(published.error);

    return ok(undefined);
  };
