/**
 * Tagged errors do agregado `Payable` — DO D§22-D§24.
 *
 *   - DO D§22: "Tagged error shape **flat** (`{ tag, …payload }`). Case
 *     constructors como **free functions** em `errors.ts` por agregado.
 *     Consumo via `import * as PayableError from './errors.ts'`."
 *
 *   - DO D§23: "Payload de erro de invariante carrega **as duas peças de
 *     evidência que colidiram** (estado atual + tentativa)."
 *
 *   - DO D§24: "Erros: **PascalCase adjetival/factual** (`PayableNotOpen`).
 *     Eventos: PascalCase passado (`PayableOpened`)."
 *
 * **Fonte de negócio (handbook):**
 *   - `handbook/domain/04-titulos-liquidacao-context.md:54` — **R1 (Soberania
 *     da Aprovação):** justifica `PayableNotOpen` e `PayableNotApproved`.
 *   - `handbook/domain/04-titulos-liquidacao-context.md:60` — **R5 (Status
 *     Atrasado):** justifica `PayableOverdueBeforeDueDate` (só marca após vencer).
 *   - §6 "Caminho de Recusa e Recuperação" — justifica `PayableNotRejected`
 *     e `PayableResetDateBeforeRejectedAt`.
 *
 * Pattern espelha `src/modules/contracts/domain/contract/errors.ts`.
 */

import type { PayableStatus } from './types.ts';

// ─── Validação de input (core) ─────────────────────────────────────────

export type PayableSourceDocumentRequired = Readonly<{ tag: 'PayableSourceDocumentRequired' }>;
export type PayableValueZero = Readonly<{ tag: 'PayableValueZero' }>;
export type PayableInvalidDueDate = Readonly<{ tag: 'PayableInvalidDueDate' }>;
export type PayableInvalidOpenedAt = Readonly<{ tag: 'PayableInvalidOpenedAt' }>;

// ─── Precondicionais de estado (NotX) ──────────────────────────────────

export type PayableNotOpen = Readonly<{
  tag: 'PayableNotOpen';
  currentStatus: PayableStatus;
}>;

export type PayableNotApproved = Readonly<{
  tag: 'PayableNotApproved';
  currentStatus: PayableStatus;
}>;

export type PayableNotTransmitted = Readonly<{
  tag: 'PayableNotTransmitted';
  currentStatus: PayableStatus;
}>;

export type PayableNotRejected = Readonly<{
  tag: 'PayableNotRejected';
  currentStatus: PayableStatus;
}>;

export type PayableNotOverdue = Readonly<{
  tag: 'PayableNotOverdue';
  currentStatus: PayableStatus;
}>;

export type PayableNotPaid = Readonly<{
  tag: 'PayableNotPaid';
  currentStatus: PayableStatus;
}>;

/**
 * Precondicional para `processBankOutflow`: aceita Transmitted OU Overdue
 * (handbook §6 "Atrasado → Pago: SaidaBancariaConfirmada (tardia)").
 */
export type PayableNotTransmittedOrOverdue = Readonly<{
  tag: 'PayableNotTransmittedOrOverdue';
  currentStatus: PayableStatus;
}>;

// ─── Datas malformadas (sem payload — `isValidDate` falhou) ────────────

export type PayableInvalidApprovalDate = Readonly<{ tag: 'PayableInvalidApprovalDate' }>;
export type PayableInvalidTransmissionDate = Readonly<{ tag: 'PayableInvalidTransmissionDate' }>;
export type PayableInvalidRejectionDate = Readonly<{ tag: 'PayableInvalidRejectionDate' }>;
export type PayableInvalidOverdueDate = Readonly<{ tag: 'PayableInvalidOverdueDate' }>;
export type PayableInvalidResetDate = Readonly<{ tag: 'PayableInvalidResetDate' }>;
export type PayableInvalidManualPaymentDate = Readonly<{
  tag: 'PayableInvalidManualPaymentDate';
}>;
export type PayableInvalidBankOutflowDate = Readonly<{ tag: 'PayableInvalidBankOutflowDate' }>;
export type PayableInvalidBankPaymentDate = Readonly<{ tag: 'PayableInvalidBankPaymentDate' }>;
export type PayableInvalidSettlementDate = Readonly<{ tag: 'PayableInvalidSettlementDate' }>;

// ─── Invariantes temporais (D23 — duas peças que colidiram) ────────────

export type PayableApprovalDateBeforeOpenedAt = Readonly<{
  tag: 'PayableApprovalDateBeforeOpenedAt';
  openedAt: Date;
  attemptedAt: Date;
}>;

export type PayableTransmissionDateBeforeApprovedAt = Readonly<{
  tag: 'PayableTransmissionDateBeforeApprovedAt';
  approvedAt: Date;
  attemptedAt: Date;
}>;

export type PayableRejectionDateBeforeTransmittedAt = Readonly<{
  tag: 'PayableRejectionDateBeforeTransmittedAt';
  transmittedAt: Date;
  attemptedAt: Date;
}>;

export type PayableOverdueBeforeDueDate = Readonly<{
  tag: 'PayableOverdueBeforeDueDate';
  dueDate: Date;
  attemptedAt: Date;
}>;

export type PayableResetDateBeforeRejectedAt = Readonly<{
  tag: 'PayableResetDateBeforeRejectedAt';
  rejectedAt: Date;
  attemptedAt: Date;
}>;

export type PayableManualPaymentDateBeforeApprovedAt = Readonly<{
  tag: 'PayableManualPaymentDateBeforeApprovedAt';
  approvedAt: Date;
  attemptedAt: Date;
}>;

export type PayableBankOutflowDateBeforeTransmittedAt = Readonly<{
  tag: 'PayableBankOutflowDateBeforeTransmittedAt';
  transmittedAt: Date;
  attemptedAt: Date;
}>;

export type PayableSettlementDateBeforePaidAt = Readonly<{
  tag: 'PayableSettlementDateBeforePaidAt';
  paidAt: Date;
  attemptedAt: Date;
}>;

// ─── Validação do rejection reason ─────────────────────────────────────

export type PayableRejectionReasonRequired = Readonly<{ tag: 'PayableRejectionReasonRequired' }>;
export type PayableRejectionReasonTooLong = Readonly<{ tag: 'PayableRejectionReasonTooLong' }>;

// ─── Union pública ─────────────────────────────────────────────────────

// ─── Union pública ─────────────────────────────────────────────────────
//
// **Threshold de refactor ATINGIDO (30 variants).** TODO para o próximo
// ticket da camada Application (`FIN-PORT-PAYABLE-REPO` ou seguintes):
// avaliar grouping em sub-unions tipadas:
//   - `PayableValidationError` (Required, Zero, *TooLong)
//   - `PayableInvariantError` (*Before*, *NotYet)
//   - `PayableTransitionError` (NotX, Invalid*Date)
// Hoje (30) ainda é legível mas começa a fazer switch exhaustivo verboso.

export type PayableError =
  | PayableSourceDocumentRequired
  | PayableValueZero
  | PayableInvalidDueDate
  | PayableInvalidOpenedAt
  | PayableInvalidApprovalDate
  | PayableApprovalDateBeforeOpenedAt
  | PayableNotOpen
  | PayableNotApproved
  | PayableNotTransmitted
  | PayableNotRejected
  | PayableNotOverdue
  | PayableNotPaid
  | PayableNotTransmittedOrOverdue
  | PayableInvalidTransmissionDate
  | PayableInvalidRejectionDate
  | PayableInvalidOverdueDate
  | PayableInvalidResetDate
  | PayableInvalidManualPaymentDate
  | PayableInvalidBankOutflowDate
  | PayableInvalidBankPaymentDate
  | PayableInvalidSettlementDate
  | PayableTransmissionDateBeforeApprovedAt
  | PayableRejectionDateBeforeTransmittedAt
  | PayableOverdueBeforeDueDate
  | PayableResetDateBeforeRejectedAt
  | PayableManualPaymentDateBeforeApprovedAt
  | PayableBankOutflowDateBeforeTransmittedAt
  | PayableSettlementDateBeforePaidAt
  | PayableRejectionReasonRequired
  | PayableRejectionReasonTooLong;

// ─── Constructor functions ─────────────────────────────────────────────

export const payableSourceDocumentRequired = (): PayableSourceDocumentRequired => ({
  tag: 'PayableSourceDocumentRequired',
});

export const payableValueZero = (): PayableValueZero => ({ tag: 'PayableValueZero' });

export const payableInvalidDueDate = (): PayableInvalidDueDate => ({
  tag: 'PayableInvalidDueDate',
});

export const payableInvalidOpenedAt = (): PayableInvalidOpenedAt => ({
  tag: 'PayableInvalidOpenedAt',
});

export const payableInvalidApprovalDate = (): PayableInvalidApprovalDate => ({
  tag: 'PayableInvalidApprovalDate',
});

export const payableInvalidTransmissionDate = (): PayableInvalidTransmissionDate => ({
  tag: 'PayableInvalidTransmissionDate',
});

export const payableInvalidRejectionDate = (): PayableInvalidRejectionDate => ({
  tag: 'PayableInvalidRejectionDate',
});

export const payableInvalidOverdueDate = (): PayableInvalidOverdueDate => ({
  tag: 'PayableInvalidOverdueDate',
});

export const payableInvalidResetDate = (): PayableInvalidResetDate => ({
  tag: 'PayableInvalidResetDate',
});

export const payableApprovalDateBeforeOpenedAt = (
  openedAt: Date,
  attemptedAt: Date,
): PayableApprovalDateBeforeOpenedAt => ({
  tag: 'PayableApprovalDateBeforeOpenedAt',
  openedAt,
  attemptedAt,
});

export const payableTransmissionDateBeforeApprovedAt = (
  approvedAt: Date,
  attemptedAt: Date,
): PayableTransmissionDateBeforeApprovedAt => ({
  tag: 'PayableTransmissionDateBeforeApprovedAt',
  approvedAt,
  attemptedAt,
});

export const payableRejectionDateBeforeTransmittedAt = (
  transmittedAt: Date,
  attemptedAt: Date,
): PayableRejectionDateBeforeTransmittedAt => ({
  tag: 'PayableRejectionDateBeforeTransmittedAt',
  transmittedAt,
  attemptedAt,
});

export const payableOverdueBeforeDueDate = (
  dueDate: Date,
  attemptedAt: Date,
): PayableOverdueBeforeDueDate => ({
  tag: 'PayableOverdueBeforeDueDate',
  dueDate,
  attemptedAt,
});

export const payableResetDateBeforeRejectedAt = (
  rejectedAt: Date,
  attemptedAt: Date,
): PayableResetDateBeforeRejectedAt => ({
  tag: 'PayableResetDateBeforeRejectedAt',
  rejectedAt,
  attemptedAt,
});

export const payableNotOpen = (currentStatus: PayableStatus): PayableNotOpen => ({
  tag: 'PayableNotOpen',
  currentStatus,
});

export const payableNotApproved = (currentStatus: PayableStatus): PayableNotApproved => ({
  tag: 'PayableNotApproved',
  currentStatus,
});

export const payableNotTransmitted = (currentStatus: PayableStatus): PayableNotTransmitted => ({
  tag: 'PayableNotTransmitted',
  currentStatus,
});

export const payableNotRejected = (currentStatus: PayableStatus): PayableNotRejected => ({
  tag: 'PayableNotRejected',
  currentStatus,
});

export const payableNotOverdue = (currentStatus: PayableStatus): PayableNotOverdue => ({
  tag: 'PayableNotOverdue',
  currentStatus,
});

export const payableNotPaid = (currentStatus: PayableStatus): PayableNotPaid => ({
  tag: 'PayableNotPaid',
  currentStatus,
});

export const payableNotTransmittedOrOverdue = (
  currentStatus: PayableStatus,
): PayableNotTransmittedOrOverdue => ({
  tag: 'PayableNotTransmittedOrOverdue',
  currentStatus,
});

export const payableInvalidManualPaymentDate = (): PayableInvalidManualPaymentDate => ({
  tag: 'PayableInvalidManualPaymentDate',
});

export const payableInvalidBankOutflowDate = (): PayableInvalidBankOutflowDate => ({
  tag: 'PayableInvalidBankOutflowDate',
});

export const payableInvalidBankPaymentDate = (): PayableInvalidBankPaymentDate => ({
  tag: 'PayableInvalidBankPaymentDate',
});

export const payableInvalidSettlementDate = (): PayableInvalidSettlementDate => ({
  tag: 'PayableInvalidSettlementDate',
});

export const payableManualPaymentDateBeforeApprovedAt = (
  approvedAt: Date,
  attemptedAt: Date,
): PayableManualPaymentDateBeforeApprovedAt => ({
  tag: 'PayableManualPaymentDateBeforeApprovedAt',
  approvedAt,
  attemptedAt,
});

export const payableBankOutflowDateBeforeTransmittedAt = (
  transmittedAt: Date,
  attemptedAt: Date,
): PayableBankOutflowDateBeforeTransmittedAt => ({
  tag: 'PayableBankOutflowDateBeforeTransmittedAt',
  transmittedAt,
  attemptedAt,
});

export const payableSettlementDateBeforePaidAt = (
  paidAt: Date,
  attemptedAt: Date,
): PayableSettlementDateBeforePaidAt => ({
  tag: 'PayableSettlementDateBeforePaidAt',
  paidAt,
  attemptedAt,
});

export const payableRejectionReasonRequired = (): PayableRejectionReasonRequired => ({
  tag: 'PayableRejectionReasonRequired',
});

export const payableRejectionReasonTooLong = (): PayableRejectionReasonTooLong => ({
  tag: 'PayableRejectionReasonTooLong',
});
