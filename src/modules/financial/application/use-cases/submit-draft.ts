import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type { DocumentEvent } from '../../domain/document/events.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import {
  checkApprover,
  escalate,
  type ApprovalError,
} from '../../domain/document/approval-policy.ts';
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
  | ApproverAuthorityReadError
  | UserRef.UserRefError;

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

    // CA7 (#289) + cascata US3 (#297): valida a alçada do indicado contra o líquido; em
    // `approver-limit-exceeded`, reencaminha ao próximo aprovador apto (paridade com save-document.ts).
    // Gate opt-in: só roda com aprovador no rascunho e reader injetado (composição HTTP injeta).
    let outcome = submitted.value;
    const cascadeEvents: DocumentEvent[] = [];
    if (draft.value.approverRef !== null && deps.approverAuthorityReader !== undefined) {
      const indicatedApproverRef = draft.value.approverRef; // narrow preservado através dos awaits
      const authority = await deps.approverAuthorityReader.get(String(indicatedApproverRef));
      if (!authority.ok) return err(authority.error);
      const check = checkApprover(outcome.document.netValue, authority.value);
      if (!check.ok) {
        // Só `approver-limit-exceeded` aciona a cascata; not-found/missing-permission propagam direto.
        if (check.error !== 'approver-limit-exceeded') return err(check.error);

        const candidates = await deps.approverAuthorityReader.list();
        if (!candidates.ok) return err(candidates.error);
        const escalated = escalate(outcome.document.netValue, candidates.value);
        if (!escalated.ok) return err(escalated.error);

        const effectiveApproverRef = UserRef.rehydrate(escalated.value.userId);
        if (!effectiveApproverRef.ok) return err(effectiveApproverRef.error);

        const reSubmitted = Document.submit(draft.value, effectiveApproverRef.value);
        if (!reSubmitted.ok) return err(reSubmitted.error);
        outcome = reSubmitted.value;

        cascadeEvents.push({
          type: 'ApproverEscalated',
          documentId: String(outcome.document.id),
          indicatedApproverRef,
          effectiveApproverRef: effectiveApproverRef.value,
        });
      }
    }

    // Trilha: marco de submissão. before = rascunho lido (Draft, sem títulos);
    // after = Open com títulos gerados. `ApproverEscalated` vai só ao outbox (não à timeline).
    const event = outcome.events[0];
    if (event === undefined) return err('document-repository-failure');
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: draft.value,
      after: outcome.document,
      payablesBefore: null,
      payablesAfter: outcome.payables,
      actor: null,
    });

    const saved = await deps.repo.save(
      {
        document: outcome.document,
        payables: outcome.payables,
      },
      entries,
      undefined,
      [...outcome.events, ...cascadeEvents],
    );
    if (!saved.ok) return err(saved.error);

    return ok(undefined);
  };
