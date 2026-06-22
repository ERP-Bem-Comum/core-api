import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import { buildTimelineEntries } from '../timeline-recording.ts';

export type UndoApprovalDeps = Readonly<{
  repo: DocumentRepository;
  clock: Clock;
}>;
export type UndoApprovalCommand = Readonly<{
  documentId: string;
  // Optimistic lock (FR-009/ADR-0002 da feature 010): versão do documento lida pelo cliente.
  // Repassada ao `repo.save` como `expectedVersion` — UPDATE com WHERE version = expectedVersion.
  expectedVersion: number;
}>;
export type UndoApprovalError =
  | DocumentError
  | DocumentRepositoryError
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

    // Trilha: marco de desfazer-aprovação. before = estado lido (Approved); after = Open.
    const event = undone.value.events[0];
    if (event === undefined) return err('document-repository-failure');
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: approved.value,
      after: undone.value.document,
      payablesBefore: found.value.payables,
      payablesAfter: undone.value.payables,
      actor: null,
    });

    const saved = await deps.repo.save(
      {
        document: undone.value.document,
        payables: undone.value.payables,
      },
      entries,
      cmd.expectedVersion,
      undone.value.events,
    );
    if (!saved.ok) return err(saved.error);

    return ok(undefined);
  };
