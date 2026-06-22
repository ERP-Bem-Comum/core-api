import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';

export type CancelDocumentDeps = Readonly<{ repo: DocumentRepository }>;
export type CancelDocumentCommand = Readonly<{ documentId: string; expectedVersion: number }>;
export type CancelDocumentError =
  | DocumentError
  | DocumentRepositoryError
  | DocumentId.DocumentIdError;

export const cancelDocument =
  (deps: CancelDocumentDeps) =>
  async (cmd: CancelDocumentCommand): Promise<Result<void, CancelDocumentError>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(id.error);

    const found = await deps.repo.findById(id.value);
    if (!found.ok) return err(found.error);

    const doc = found.value.document;

    // #166: rascunho (Draft) também pode ser descartado — não tem títulos-filho.
    if (doc.status === 'Draft') {
      const draft = Document.parseDraft(doc);
      if (!draft.ok) return err(draft.error);
      const cancelled = Document.cancelDraft(draft.value);
      if (!cancelled.ok) return err(cancelled.error);
      const deleted = await deps.repo.delete(id.value, cmd.expectedVersion, cancelled.value.events);
      if (!deleted.ok) return err(deleted.error);
      return ok(undefined);
    }

    // Open: hard delete junto dos títulos-filho. Approved não é cancelável (invalid-state-transition).
    const open = Document.parseOpen(doc);
    if (!open.ok) return err(open.error);
    if (found.value.payables === null) return err('document-repository-failure');

    const cancelled = Document.cancel({ document: open.value, payables: found.value.payables });
    if (!cancelled.ok) return err(cancelled.error);

    const deleted = await deps.repo.delete(id.value, cmd.expectedVersion, cancelled.value.events);
    if (!deleted.ok) return err(deleted.error);

    return ok(undefined);
  };
