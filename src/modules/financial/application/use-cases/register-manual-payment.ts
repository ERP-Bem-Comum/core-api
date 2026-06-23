import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as PayableId from '../../domain/shared/payable-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import { buildTimelineEntries } from '../timeline-recording.ts';

// #223 (carve-out do #59): baixa manual de UM título (Aprovado→Pago), por título (#201). O documento
// precisa estar Approved; só o título alvo vira Pago (os irmãos seguem Aprovados). Trilha do operador
// (actor) + evento `PayableManuallyPaid` gravado na MESMA tx do estado (atomicidade — #127).
export type RegisterManualPaymentDeps = Readonly<{
  repo: DocumentRepository;
  clock: Clock;
}>;

export type RegisterManualPaymentCommand = Readonly<{
  documentId: string;
  payableId: string;
  paidBy: string;
  // Optimistic lock (FR-009): versão lida pelo cliente; repassada ao `repo.save`.
  expectedVersion: number;
  reason?: string;
}>;

export type RegisterManualPaymentError =
  | DocumentError
  | DocumentRepositoryError
  | DocumentId.DocumentIdError
  | PayableId.PayableIdError
  | UserRef.UserRefError;

export const registerManualPayment =
  (deps: RegisterManualPaymentDeps) =>
  async (cmd: RegisterManualPaymentCommand): Promise<Result<void, RegisterManualPaymentError>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(id.error);
    const payableId = PayableId.rehydrate(cmd.payableId);
    if (!payableId.ok) return err(payableId.error);
    const by = UserRef.rehydrate(cmd.paidBy);
    if (!by.ok) return err(by.error);

    const found = await deps.repo.findById(id.value);
    if (!found.ok) return err(found.error);

    const approved = Document.parseApproved(found.value.document);
    if (!approved.ok) return err(approved.error);
    if (found.value.payables === null) return err('document-repository-failure');

    const paid = Document.payPayableManually({
      document: approved.value,
      payables: found.value.payables,
      payableId: payableId.value,
      by: by.value,
      at: deps.clock.now(),
      ...(cmd.reason !== undefined ? { reason: cmd.reason } : {}),
    });
    if (!paid.ok) return err(paid.error);

    // Trilha: marco de baixa manual. before = Approved; after = mesmo documento (status inalterado) com
    // o título alvo Pago. actor = quem deu a baixa.
    const event = paid.value.events[0];
    if (event === undefined) return err('document-repository-failure');
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: approved.value,
      after: paid.value.document,
      payablesBefore: found.value.payables,
      payablesAfter: paid.value.payables,
      actor: by.value,
    });

    const saved = await deps.repo.save(
      { document: paid.value.document, payables: paid.value.payables },
      entries,
      cmd.expectedVersion,
      paid.value.events,
    );
    if (!saved.ok) return err(saved.error);

    return ok(undefined);
  };
