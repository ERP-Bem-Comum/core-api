/**
 * Operações do agregado `Payable` (Título Financeiro).
 *
 * Pattern espelha `src/modules/contracts/domain/contract/contract.ts` —
 * agregado exportado como objeto namespace (não Padrão D, vide Bloco A
 * DON'T §1 do master doc). Transições constroem novo subtipo refinado
 * via `immutable({ ...prev, status, ... })` sem `Brand` na casca.
 *
 * **Operações implementadas:**
 *   - `open` — Smart constructor: nasce Open.
 *   - `approve` — Open → Approved (R1 Soberania da Aprovação).
 *   - `transmit` — Approved → Transmitted (gera remessa CNAB).
 *   - `registerRejection` — Transmitted → Rejected (banco recusou).
 *   - `markOverdue` — Transmitted → Overdue (D+1 sem retorno, R5).
 *   - `resetToApproved` — Rejected → Approved (recovery após corrigir).
 *   - `parseOpen/Approved/Transmitted/Rejected/Overdue` — refinement constructors.
 *
 * **Fora do escopo (próximo ticket `FIN-AGG-PAYABLE-PAYMENT`):**
 *   - `Transmitted → Paid` (processBankOutflow)
 *   - `Overdue → Paid` (confirmação tardia)
 *   - `Approved → Paid` (registerManualPayment)
 *   - `Paid → Settled` (authorizeSettlement)
 *
 * handbook/domain/04-titulos-liquidacao-context.md §4 (comandos), §5 (R1/R5),
 * §6 (fluxos), §7 (máquina de estados completa).
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import { isValidDate } from '#src/shared/utils/date.ts';
import type { UserRef } from '#src/shared/kernel/user-ref.ts';
import type { FITID } from '../shared/fitid.ts';
import type { RemittanceId } from '../shared/remittance-id.ts';
import type {
  Payable as PayableEntity,
  OpenPayable,
  ApprovedPayable,
  TransmittedPayable,
  RejectedPayable,
  OverduePayable,
  PaidPayable,
  PaidFromManualPayable,
  PaidFromBankPayable,
  SettledPayable,
  SettledFromManualPayable,
  SettledFromBankPayable,
  OpenPayableInput,
} from './types.ts';
import type { PayableEvent } from './events.ts';
import * as PayableError from './errors.ts';

// ─── Constantes ────────────────────────────────────────────────────────

// CNAB 240 retorno: códigos descritivos de erro (segmentos T/U/Z) trazem
// motivo da recusa em campo de até ~80 chars, mas concatenações multi-segmento
// + descrição humana adicionada pelo adapter de Integração Bancária podem
// chegar a algumas centenas. 500 é margem confortável sem flertar com payload
// excessivo no agregado.
const REJECTION_REASON_MAX = 500;

// ─── Smart constructor — open ──────────────────────────────────────────

const open = (
  input: OpenPayableInput,
): Result<{ payable: OpenPayable; event: PayableEvent }, PayableError.PayableError> => {
  if (!isValidDate(input.openedAt)) return err(PayableError.payableInvalidOpenedAt());
  if (!isValidDate(input.dueDate)) return err(PayableError.payableInvalidDueDate());
  if (input.value.cents === 0) return err(PayableError.payableValueZero());

  const payable: OpenPayable = immutable({
    id: input.id,
    sourceDocumentId: input.sourceDocumentId,
    kind: input.kind,
    paymentMethod: input.paymentMethod,
    beneficiary: input.beneficiary,
    value: input.value,
    dueDate: input.dueDate,
    openedAt: input.openedAt,
    status: 'Open' as const,
  });

  const event: PayableEvent = {
    type: 'PayableOpened',
    payableId: payable.id,
    occurredAt: input.openedAt,
  };

  return ok({ payable, event });
};

// ─── Transition — approve (Open → Approved) ────────────────────────────

const approve = (
  payable: PayableEntity,
  approvedBy: UserRef,
  approvedAt: Date,
): Result<{ payable: ApprovedPayable; event: PayableEvent }, PayableError.PayableError> => {
  if (payable.status !== 'Open') {
    return err(PayableError.payableNotOpen(payable.status));
  }
  if (!isValidDate(approvedAt)) {
    return err(PayableError.payableInvalidApprovalDate());
  }
  if (approvedAt.getTime() < payable.openedAt.getTime()) {
    return err(PayableError.payableApprovalDateBeforeOpenedAt(payable.openedAt, approvedAt));
  }

  const next: ApprovedPayable = immutable({
    ...payable,
    status: 'Approved' as const,
    approvedAt,
    approvedBy,
  });

  const event: PayableEvent = {
    type: 'PayableApproved',
    payableId: next.id,
    occurredAt: approvedAt,
    approvedBy,
  };

  return ok({ payable: next, event });
};

// ─── Transition — transmit (Approved → Transmitted) ────────────────────

const transmit = (
  payable: PayableEntity,
  remittanceId: RemittanceId,
  transmittedAt: Date,
): Result<{ payable: TransmittedPayable; event: PayableEvent }, PayableError.PayableError> => {
  if (payable.status !== 'Approved') {
    return err(PayableError.payableNotApproved(payable.status));
  }
  if (!isValidDate(transmittedAt)) {
    return err(PayableError.payableInvalidTransmissionDate());
  }
  if (transmittedAt.getTime() < payable.approvedAt.getTime()) {
    return err(
      PayableError.payableTransmissionDateBeforeApprovedAt(payable.approvedAt, transmittedAt),
    );
  }

  const next: TransmittedPayable = immutable({
    ...payable,
    status: 'Transmitted' as const,
    transmittedAt,
    remittanceId,
  });

  const event: PayableEvent = {
    type: 'PayableTransmitted',
    payableId: next.id,
    occurredAt: transmittedAt,
    remittanceId,
  };

  return ok({ payable: next, event });
};

// ─── Transition — registerRejection (Transmitted → Rejected) ───────────

const registerRejection = (
  payable: PayableEntity,
  rejectionReason: string,
  rejectedAt: Date,
): Result<{ payable: RejectedPayable; event: PayableEvent }, PayableError.PayableError> => {
  if (payable.status !== 'Transmitted') {
    return err(PayableError.payableNotTransmitted(payable.status));
  }
  if (!isValidDate(rejectedAt)) {
    return err(PayableError.payableInvalidRejectionDate());
  }
  if (rejectedAt.getTime() < payable.transmittedAt.getTime()) {
    return err(
      PayableError.payableRejectionDateBeforeTransmittedAt(payable.transmittedAt, rejectedAt),
    );
  }
  const trimmedReason = rejectionReason.trim();
  if (trimmedReason.length === 0) {
    return err(PayableError.payableRejectionReasonRequired());
  }
  if (trimmedReason.length > REJECTION_REASON_MAX) {
    return err(PayableError.payableRejectionReasonTooLong());
  }

  const next: RejectedPayable = immutable({
    ...payable,
    status: 'Rejected' as const,
    rejectedAt,
    rejectionReason: trimmedReason,
  });

  const event: PayableEvent = {
    type: 'PayableRejected',
    payableId: next.id,
    occurredAt: rejectedAt,
    rejectionReason: trimmedReason,
  };

  return ok({ payable: next, event });
};

// ─── Transition — markOverdue (Transmitted → Overdue) ──────────────────

const markOverdue = (
  payable: PayableEntity,
  markedOverdueAt: Date,
): Result<{ payable: OverduePayable; event: PayableEvent }, PayableError.PayableError> => {
  if (payable.status !== 'Transmitted') {
    return err(PayableError.payableNotTransmitted(payable.status));
  }
  if (!isValidDate(markedOverdueAt)) {
    return err(PayableError.payableInvalidOverdueDate());
  }
  // R5 do handbook: Atrasado só faz sentido APÓS dueDate vencer.
  // Mesma data ou antes → não venceu ainda, rejeita.
  if (markedOverdueAt.getTime() <= payable.dueDate.getTime()) {
    return err(PayableError.payableOverdueBeforeDueDate(payable.dueDate, markedOverdueAt));
  }

  const next: OverduePayable = immutable({
    ...payable,
    status: 'Overdue' as const,
    markedOverdueAt,
  });

  const event: PayableEvent = {
    type: 'PayableMarkedOverdue',
    payableId: next.id,
    occurredAt: markedOverdueAt,
  };

  return ok({ payable: next, event });
};

// ─── Transition — resetToApproved (Rejected → Approved) ────────────────

const resetToApproved = (
  payable: PayableEntity,
  resetAt: Date,
): Result<{ payable: ApprovedPayable; event: PayableEvent }, PayableError.PayableError> => {
  if (payable.status !== 'Rejected') {
    return err(PayableError.payableNotRejected(payable.status));
  }
  if (!isValidDate(resetAt)) {
    return err(PayableError.payableInvalidResetDate());
  }
  if (resetAt.getTime() < payable.rejectedAt.getTime()) {
    return err(PayableError.payableResetDateBeforeRejectedAt(payable.rejectedAt, resetAt));
  }

  // Reset reconstrói ApprovedPayable do zero — drop de campos de
  // transmissão/rejeição. Mantém approvedAt + approvedBy originais
  // (D4 do 000-request).
  const next: ApprovedPayable = immutable({
    id: payable.id,
    sourceDocumentId: payable.sourceDocumentId,
    kind: payable.kind,
    paymentMethod: payable.paymentMethod,
    beneficiary: payable.beneficiary,
    value: payable.value,
    dueDate: payable.dueDate,
    openedAt: payable.openedAt,
    status: 'Approved' as const,
    approvedAt: payable.approvedAt,
    approvedBy: payable.approvedBy,
  });

  const event: PayableEvent = {
    type: 'PayableResetToApproved',
    payableId: next.id,
    occurredAt: resetAt,
    previousRejectionReason: payable.rejectionReason,
    previousRemittanceId: payable.remittanceId,
  };

  return ok({ payable: next, event });
};

// ─── Transition — registerManualPayment (Approved → Paid Manual) ──────

const registerManualPayment = (
  payable: PayableEntity,
  paymentRegisteredBy: UserRef,
  paidAt: Date,
): Result<{ payable: PaidFromManualPayable; event: PayableEvent }, PayableError.PayableError> => {
  if (payable.status !== 'Approved') {
    return err(PayableError.payableNotApproved(payable.status));
  }
  if (!isValidDate(paidAt)) {
    return err(PayableError.payableInvalidManualPaymentDate());
  }
  if (paidAt.getTime() < payable.approvedAt.getTime()) {
    return err(PayableError.payableManualPaymentDateBeforeApprovedAt(payable.approvedAt, paidAt));
  }

  const next: PaidFromManualPayable = immutable({
    ...payable,
    status: 'Paid' as const,
    paidVia: 'Manual' as const,
    paidAt,
    paymentRegisteredBy,
  });

  const event: PayableEvent = {
    type: 'PayablePaidManually',
    payableId: next.id,
    occurredAt: paidAt,
    paidAt,
    paymentRegisteredBy,
  };

  return ok({ payable: next, event });
};

// ─── Transition — processBankOutflow (Transmitted/Overdue → Paid Bank) ─

/**
 * Confirma saída bancária via retorno CNAB / extrato OFX.
 *
 * **Parâmetros temporais (D4 + D8 do 000-request FIN-AGG-PAYABLE-PAYMENT):**
 *   - `occurredAt`: quando o SISTEMA processou o retorno/extrato. Comparado
 *     com `transmittedAt` (não pode ser anterior — invariante temporal D23).
 *   - `bankPaymentDate`: data efetiva da saída bancária NO BANCO (lida do
 *     extrato). **NÃO é validada contra `transmittedAt`** porque o banco pode
 *     informar qualquer data no extrato — sistema só registra como evidência
 *     R5. Apenas `isValidDate` é checado.
 *
 * R5 do handbook (Diferenciação Retorno vs. Saída): PAGO só após Saída
 * Bancária — `fitid` + `bankPaymentDate` ficam obrigatórios no `PaidFromBank`.
 */
const processBankOutflow = (
  payable: PayableEntity,
  fitid: FITID,
  bankPaymentDate: Date,
  occurredAt: Date,
): Result<{ payable: PaidFromBankPayable; event: PayableEvent }, PayableError.PayableError> => {
  if (payable.status !== 'Transmitted' && payable.status !== 'Overdue') {
    return err(PayableError.payableNotTransmittedOrOverdue(payable.status));
  }
  if (!isValidDate(occurredAt)) {
    return err(PayableError.payableInvalidBankOutflowDate());
  }
  if (!isValidDate(bankPaymentDate)) {
    return err(PayableError.payableInvalidBankPaymentDate());
  }
  if (occurredAt.getTime() < payable.transmittedAt.getTime()) {
    return err(
      PayableError.payableBankOutflowDateBeforeTransmittedAt(payable.transmittedAt, occurredAt),
    );
  }

  // Reconstrói preservando TransmissionRecord (drop de markedOverdueAt se Overdue).
  const next: PaidFromBankPayable = immutable({
    id: payable.id,
    sourceDocumentId: payable.sourceDocumentId,
    kind: payable.kind,
    paymentMethod: payable.paymentMethod,
    beneficiary: payable.beneficiary,
    value: payable.value,
    dueDate: payable.dueDate,
    openedAt: payable.openedAt,
    approvedAt: payable.approvedAt,
    approvedBy: payable.approvedBy,
    transmittedAt: payable.transmittedAt,
    remittanceId: payable.remittanceId,
    status: 'Paid' as const,
    paidVia: 'Bank' as const,
    paidAt: occurredAt,
    fitid,
    bankPaymentDate,
  });

  const event: PayableEvent = {
    type: 'PayableBankOutflowConfirmed',
    payableId: next.id,
    occurredAt,
    fitid,
    bankPaymentDate,
  };

  return ok({ payable: next, event });
};

// ─── Transition — authorizeSettlement (Paid → Settled) ─────────────────

const authorizeSettlement = (
  payable: PayableEntity,
  settledBy: UserRef,
  settledAt: Date,
): Result<{ payable: SettledPayable; event: PayableEvent }, PayableError.PayableError> => {
  if (payable.status !== 'Paid') {
    return err(PayableError.payableNotPaid(payable.status));
  }
  if (!isValidDate(settledAt)) {
    return err(PayableError.payableInvalidSettlementDate());
  }
  if (settledAt.getTime() < payable.paidAt.getTime()) {
    return err(PayableError.payableSettlementDateBeforePaidAt(payable.paidAt, settledAt));
  }

  // Evento é idêntico em ambos os sub-types — extraído antes do switch
  // sobre `paidVia` (Sug 1 do W2: reduzir duplicação dos branches).
  const event: PayableEvent = {
    type: 'PayableSettled',
    payableId: payable.id,
    occurredAt: settledAt,
    settledBy,
  };

  // Preserva sub-type — narrow sobre `paidVia` constrói o branch tipado.
  if (payable.paidVia === 'Manual') {
    const next: SettledFromManualPayable = immutable({
      ...payable,
      status: 'Settled' as const,
      settledAt,
      settledBy,
    });
    return ok({ payable: next, event });
  }

  // payable.paidVia === 'Bank' — TS narrow garante PaidFromBankPayable
  const next: SettledFromBankPayable = immutable({
    ...payable,
    status: 'Settled' as const,
    settledAt,
    settledBy,
  });
  return ok({ payable: next, event });
};

// ─── Refinement constructors (DO D§21 — parse, don't validate) ─────────

const parseOpen = (payable: PayableEntity): Result<OpenPayable, PayableError.PayableNotOpen> =>
  payable.status === 'Open' ? ok(payable) : err(PayableError.payableNotOpen(payable.status));

const parseApproved = (
  payable: PayableEntity,
): Result<ApprovedPayable, PayableError.PayableNotOpen> =>
  payable.status === 'Approved' ? ok(payable) : err(PayableError.payableNotOpen(payable.status));

const parseTransmitted = (
  payable: PayableEntity,
): Result<TransmittedPayable, PayableError.PayableNotTransmitted> =>
  payable.status === 'Transmitted'
    ? ok(payable)
    : err(PayableError.payableNotTransmitted(payable.status));

const parseRejected = (
  payable: PayableEntity,
): Result<RejectedPayable, PayableError.PayableNotRejected> =>
  payable.status === 'Rejected'
    ? ok(payable)
    : err(PayableError.payableNotRejected(payable.status));

const parseOverdue = (
  payable: PayableEntity,
): Result<OverduePayable, PayableError.PayableNotOverdue> =>
  payable.status === 'Overdue' ? ok(payable) : err(PayableError.payableNotOverdue(payable.status));

const parsePaid = (payable: PayableEntity): Result<PaidPayable, PayableError.PayableNotPaid> =>
  payable.status === 'Paid' ? ok(payable) : err(PayableError.payableNotPaid(payable.status));

const parseSettled = (
  payable: PayableEntity,
): Result<SettledPayable, PayableError.PayableNotPaid> =>
  payable.status === 'Settled' ? ok(payable) : err(PayableError.payableNotPaid(payable.status));

// ─── Aggregate namespace export ────────────────────────────────────────

export const Payable = {
  open,
  approve,
  transmit,
  registerRejection,
  markOverdue,
  resetToApproved,
  registerManualPayment,
  processBankOutflow,
  authorizeSettlement,
  parseOpen,
  parseApproved,
  parseTransmitted,
  parseRejected,
  parseOverdue,
  parsePaid,
  parseSettled,
};
