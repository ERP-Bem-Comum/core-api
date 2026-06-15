import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type { FinancialOutbox, OutboxAppendError } from '../ports/outbox.ts';

export type SubmitDraftDeps = Readonly<{ repo: DocumentRepository; outbox: FinancialOutbox }>;
export type SubmitDraftCommand = Readonly<{ documentId: string }>;
export type SubmitDraftError =
  | DocumentError
  | DocumentRepositoryError
  | OutboxAppendError
  | DocumentId.DocumentIdError;

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

    const saved = await deps.repo.save({
      document: submitted.value.document,
      payables: submitted.value.payables,
    });
    if (!saved.ok) return err(saved.error);

    const published = await deps.outbox.append(submitted.value.events);
    if (!published.ok) return err(published.error);

    return ok(undefined);
  };
