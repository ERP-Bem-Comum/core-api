import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import * as PayableId from '../../domain/shared/payable-id.ts';
import * as Document from '../../domain/document/document.ts';
import type { DocumentError } from '../../domain/document/errors.ts';
import type { PaymentOrigin } from '../../domain/document/events.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type { PayableRepository, PayableRepositoryError } from '../../domain/payable/repository.ts';
import type {
  FinancialTimelineRepository,
  TimelineRepositoryError,
} from '../../domain/timeline/repository.ts';
import type {
  RemittanceRepository,
  RemittanceRepositoryError,
} from '../ports/remittance-repository.ts';
import { buildTimelineEntries } from '../timeline-recording.ts';

// #61 (decisões da P.O., 02/10, 03/10 e 19/10): desfazer a baixa manual de UM título.
//
// `Paid` volta ao status DIRETAMENTE anterior à baixa — `Approved` ou `Transmitted` —, a data de
// pagamento some e o motivo vai à trilha. Mesmo desenho de escrita da baixa (`register-manual-payment.ts`):
// lê o documento inteiro para decidir, grava UMA linha por PK com CAS por estado.
//
// DE ONDE VEM O STATUS ANTERIOR
//   1. Da TRILHA. A baixa grava, desde a migration 0020, a mudança de status do título com o `before`
//      (`fin_timeline_field_changes`). Vale a ÚLTIMA baixa do título: pago, desfeito e pago de novo
//      volta à origem da segunda baixa, não da primeira.
//   2. Sem baixa na trilha (anterior à 0020): pela REMESSA — título com vínculo numa remessa viva
//      volta a `Transmitted`, senão a `Approved` (decisão da P.O., 19/10). É a mesma evidência que o
//      levou a `Transmitted`. ⚠️ Só serve a baixa ANTIGA: depois do desfazer transmissão (que mantém o
//      vínculo de propósito), uma baixa a partir de `Approved` deixaria a remessa dizendo o contrário —
//      e é exatamente por isso que a trilha tem precedência.
export type UndoManualPaymentDeps = Readonly<{
  repo: DocumentRepository;
  payableRepo: PayableRepository;
  timelineRepo: FinancialTimelineRepository;
  remittances: RemittanceRepository;
  clock: Clock;
}>;

export type UndoManualPaymentCommand = Readonly<{
  documentId: string;
  payableId: string;
  undoneBy: string;
  reason: string;
}>;

export type UndoManualPaymentError =
  | DocumentError
  | DocumentRepositoryError
  | PayableRepositoryError
  | TimelineRepositoryError
  | RemittanceRepositoryError
  | DocumentId.DocumentIdError
  | PayableId.PayableIdError
  | UserRef.UserRefError;

const isPaymentOrigin = (s: string | null): s is PaymentOrigin =>
  s === 'Approved' || s === 'Transmitted';

/** O status anterior à ÚLTIMA baixa do título, lido da trilha; `null` se ela não o registrou. */
const originFromTimeline = async (
  timelineRepo: FinancialTimelineRepository,
  documentId: DocumentId.DocumentId,
  payableId: PayableId.PayableId,
): Promise<Result<PaymentOrigin | null, TimelineRepositoryError>> => {
  const entries = await timelineRepo.findByDocument(documentId);
  if (!entries.ok) return entries;

  // `findByDocument` devolve em ordem cronológica; percorrer de trás para a frente acha a última.
  for (const entry of [...entries.value].reverse()) {
    if (entry.eventType !== 'PayableManuallyPaid') continue;
    if (entry.target.kind !== 'Payable' || entry.target.id !== payableId) continue;
    const change = entry.changes.find((c) => c.field === 'status' && c.after === 'Paid');
    if (change !== undefined && isPaymentOrigin(change.before)) return ok(change.before);
  }
  return ok(null);
};

export const undoManualPayment =
  (deps: UndoManualPaymentDeps) =>
  async (cmd: UndoManualPaymentCommand): Promise<Result<void, UndoManualPaymentError>> => {
    const id = DocumentId.rehydrate(cmd.documentId);
    if (!id.ok) return err(id.error);
    const payableId = PayableId.rehydrate(cmd.payableId);
    if (!payableId.ok) return err(payableId.error);
    const by = UserRef.rehydrate(cmd.undoneBy);
    if (!by.ok) return err(by.error);

    const found = await deps.repo.findById(id.value);
    if (!found.ok) return err(found.error);

    const approved = Document.parseApproved(found.value.document);
    if (!approved.ok) return err(approved.error);
    if (found.value.payables === null) return err('document-repository-failure');

    // Só se procura a origem de quem está pago: para os demais o domínio recusa antes de usá-la, e
    // ler trilha e remessa à toa seria custo sem decisão.
    const target = [found.value.payables.parent, ...found.value.payables.children].find(
      (p) => p.id === payableId.value,
    );
    let restoreTo: PaymentOrigin = 'Approved';
    if (target?.status === 'Paid') {
      const fromTimeline = await originFromTimeline(deps.timelineRepo, id.value, payableId.value);
      if (!fromTimeline.ok) return err(fromTimeline.error);
      if (fromTimeline.value !== null) {
        restoreTo = fromTimeline.value;
      } else {
        const held = await deps.remittances.findHeldPayables([cmd.payableId]);
        if (!held.ok) return err(held.error);
        restoreTo = held.value.length > 0 ? 'Transmitted' : 'Approved';
      }
    }

    const undone = Document.undoManualPayment({
      document: approved.value,
      payables: found.value.payables,
      payableId: payableId.value,
      restoreTo,
      by: by.value,
      reason: cmd.reason,
    });
    if (!undone.ok) return err(undone.error);

    const event = undone.value.events[0];
    if (event === undefined) return err('document-repository-failure');
    const entries = buildTimelineEntries(deps.clock, {
      event,
      before: approved.value,
      after: undone.value.document,
      payablesBefore: found.value.payables,
      payablesAfter: undone.value.payables,
      actor: by.value,
    });

    const saved = await deps.payableRepo.undoPaid({
      payableId: payableId.value,
      restoreTo,
      timelineEntries: entries,
      events: undone.value.events,
    });
    if (!saved.ok) return err(saved.error);

    return ok(undefined);
  };
