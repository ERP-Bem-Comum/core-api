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

export type SubmitDraftDeps = Readonly<{
  repo: DocumentRepository;
  clock: Clock;
}>;
export type SubmitDraftCommand = Readonly<{ documentId: string }>;
export type SubmitDraftError = DocumentError | DocumentRepositoryError | DocumentId.DocumentIdError;

export const submitDraft =
  (deps: SubmitDraftDeps) =>
  async (cmd: SubmitDraftCommand): Promise<Result<void, SubmitDraftError>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(id.error);

    const found = await deps.repo.findById(id.value);
    if (!found.ok) return err(found.error);

    const draft = Document.parseDraft(found.value.document);
    if (!draft.ok) return err(draft.error);

    const submitted = Document.submit(draft.value);
    if (!submitted.ok) return err(submitted.error);

    // Trilha: marco de submissão. before = rascunho lido (Draft, sem títulos);
    // after = Open com títulos gerados.
    const event = submitted.value.events[0];
    if (event === undefined) return err('document-repository-failure');
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: draft.value,
      after: submitted.value.document,
      payablesBefore: null,
      payablesAfter: submitted.value.payables,
      actor: null,
    });

    const saved = await deps.repo.save(
      {
        document: submitted.value.document,
        payables: submitted.value.payables,
      },
      entries,
      undefined,
      submitted.value.events,
    );
    if (!saved.ok) return err(saved.error);

    return ok(undefined);
  };
