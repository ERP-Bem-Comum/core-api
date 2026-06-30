import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import { checkApprover, type ApprovalError } from '../../domain/document/approval-policy.ts';
import type {
  ApproverAuthorityReader,
  ApproverAuthorityReadError,
} from '../ports/approver-authority-reader.ts';
import { buildTimelineEntries } from '../timeline-recording.ts';

export type SubmitDraftDeps = Readonly<{
  repo: DocumentRepository;
  clock: Clock;
  // #289 (CA7): leitura cross-módulo da alçada do aprovador (auth/public-api). Opt-in — espelha
  // o gate de save-document.ts; ausente ⇒ a submissão não valida alçada.
  approverAuthorityReader?: ApproverAuthorityReader;
}>;
export type SubmitDraftCommand = Readonly<{ documentId: string }>;
export type SubmitDraftError =
  | DocumentError
  | DocumentRepositoryError
  | DocumentId.DocumentIdError
  | ApprovalError
  | ApproverAuthorityReadError;

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

    // CA7 (#289): valida a alçada do aprovador indicado contra o líquido, antes de persistir.
    // Gate opt-in: só roda com aprovador no rascunho e reader injetado (composição HTTP injeta).
    if (draft.value.approverRef !== null && deps.approverAuthorityReader !== undefined) {
      const authority = await deps.approverAuthorityReader.get(String(draft.value.approverRef));
      if (!authority.ok) return err(authority.error);
      const check = checkApprover(submitted.value.document.netValue, authority.value);
      if (!check.ok) return err(check.error);
    }

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
