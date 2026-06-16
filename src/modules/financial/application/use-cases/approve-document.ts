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
import { buildTimelineEntries } from '../timeline-recording.ts';

export type ApproveDocumentDeps = Readonly<{
  repo: DocumentRepository;
  outbox: FinancialOutbox;
  clock: Clock;
}>;

export type ApproveDocumentCommand = Readonly<{
  documentId: string;
  approvedBy: string;
  // Optimistic lock (FR-009/ADR-0002 da feature 010): versão do documento lida pelo cliente.
  // Repassada ao `repo.save` como `expectedVersion` — UPDATE com WHERE version = expectedVersion.
  expectedVersion: number;
}>;

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

    // Trilha: marco de aprovação. before = estado lido (Open); after = Approved.
    // actor = quem aprovou (UserRef) — único marco desta fatia que carrega autoria.
    const event = approved.value.events[0];
    if (event === undefined) return err('document-repository-failure');
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: open.value,
      after: approved.value.document,
      payablesBefore: found.value.payables,
      payablesAfter: approved.value.payables,
      actor: by.value,
    });

    const saved = await deps.repo.save(
      {
        document: approved.value.document,
        payables: approved.value.payables,
      },
      entries,
      cmd.expectedVersion,
    );
    if (!saved.ok) return err(saved.error);

    const published = await deps.outbox.append(approved.value.events);
    if (!published.ok) return err(published.error);

    return ok(undefined);
  };
