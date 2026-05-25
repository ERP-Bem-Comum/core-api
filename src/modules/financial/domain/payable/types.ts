/**
 * Tipos do agregado `Payable` (Título Financeiro).
 *
 * Tipos refinados por estado — DO D§20 da entrevista 0001.
 *
 * **Composição via helper types:**
 *   - `ApprovalRecord` — campos de aprovação.
 *   - `TransmissionRecord` — herda Approval + campos de remessa CNAB.
 *   - `PaidFromManualBody` — herda Approval + campos de pagamento manual.
 *   - `PaidFromBankBody` — herda Transmission + campos de saída bancária.
 *
 * **Estados implementados (7 — máquina de estados completa):**
 *   - `Open` — recém-criado, aguardando aprovação.
 *   - `Approved` — perfil Aprovador habilitou (R1).
 *   - `Transmitted` — incluído em arquivo CNAB.
 *   - `Rejected` — banco recusou.
 *   - `Overdue` — D+1 sem confirmação (R5 — Status Atrasado).
 *   - `Paid` (union interna Manual | Bank) — pagamento confirmado.
 *   - `Settled` (union interna Manual | Bank) — Gestor autorizou baixa (R6 Crivo Humano).
 *
 * **Discriminator interno `paidVia: 'Manual' | 'Bank'` (D1 do 000-request):**
 * Manual NÃO tem `fitid`/`bankPaymentDate`; Bank tem ambos obrigatórios (DO C§29 —
 * estados eliminam optional). Pattern análogo a `TaxId = CPF | CNPJ` com `kind`.
 *
 * handbook/domain/04-titulos-liquidacao-context.md §4 (comandos), §5 (R1/R5/R6),
 * §6 (fluxos: Atrasado→Pago tardio), §7 (máquina de estados).
 */

import type { Money } from '#src/shared/kernel/money.ts';
import type { UserRef } from '#src/shared/kernel/user-ref.ts';
import type { BeneficiaryBankData } from '../shared/beneficiary-bank-data.ts';
import type { FITID } from '../shared/fitid.ts';
import type { PayableId } from '../shared/payable-id.ts';
import type { RemittanceId } from '../shared/remittance-id.ts';
import type { SourceDocumentRef } from '../shared/source-document-ref.ts';

// ─── Campos comuns ────────────────────────────────────────────────────

type PayableCore = Readonly<{
  id: PayableId;
  sourceDocumentId: SourceDocumentRef;
  kind: 'Principal' | 'Tax';
  paymentMethod: 'BankRemittance' | 'ManualExternal';
  beneficiary: BeneficiaryBankData;
  value: Money;
  dueDate: Date;
  openedAt: Date;
}>;

// ─── Helper types (composição de records por hereditariedade de estado) ─

type ApprovalRecord = Readonly<{
  approvedAt: Date;
  approvedBy: UserRef;
}>;

type TransmissionRecord = ApprovalRecord &
  Readonly<{
    transmittedAt: Date;
    remittanceId: RemittanceId;
  }>;

/**
 * Corpo de Paid via método Manual (Approved → Paid sem passar por banco).
 * NÃO tem `fitid`/`bankPaymentDate` (operador registrou pagamento externo).
 */
type PaidFromManualBody = ApprovalRecord &
  Readonly<{
    paidAt: Date;
    paidVia: 'Manual';
    paymentRegisteredBy: UserRef; // Operador (≠ Aprovador)
  }>;

/**
 * Corpo de Paid via método Bank (Transmitted/Overdue → Paid via extrato/retorno).
 * Carrega `fitid` + `bankPaymentDate` obrigatórios (R5 evidência).
 */
type PaidFromBankBody = TransmissionRecord &
  Readonly<{
    paidAt: Date; // quando sistema processou o retorno/extrato
    paidVia: 'Bank';
    fitid: FITID; // identificador único (R4 anti-duplicidade no Repository)
    bankPaymentDate: Date; // data efetiva no banco (extrato)
  }>;

// ─── Estados refinados ─────────────────────────────────────────────────

export type OpenPayable = PayableCore & Readonly<{ status: 'Open' }>;

export type ApprovedPayable = PayableCore & ApprovalRecord & Readonly<{ status: 'Approved' }>;

export type TransmittedPayable = PayableCore &
  TransmissionRecord &
  Readonly<{ status: 'Transmitted' }>;

export type RejectedPayable = PayableCore &
  TransmissionRecord &
  Readonly<{
    status: 'Rejected';
    rejectedAt: Date;
    rejectionReason: string;
  }>;

export type OverduePayable = PayableCore &
  TransmissionRecord &
  Readonly<{
    status: 'Overdue';
    markedOverdueAt: Date;
  }>;

/**
 * Payable pago via Manual (Approved → Paid). Sem fitid.
 */
export type PaidFromManualPayable = PayableCore & PaidFromManualBody & Readonly<{ status: 'Paid' }>;

/**
 * Payable pago via Bank (Transmitted/Overdue → Paid). Com fitid + bankPaymentDate.
 */
export type PaidFromBankPayable = PayableCore & PaidFromBankBody & Readonly<{ status: 'Paid' }>;

/**
 * Union interna do estado `Paid` — narrow via `paidVia` discriminator.
 */
export type PaidPayable = PaidFromManualPayable | PaidFromBankPayable;

/**
 * Liquidado a partir de Manual (preserva `ApprovalRecord` + Manual body + settled).
 */
export type SettledFromManualPayable = PayableCore &
  PaidFromManualBody &
  Readonly<{
    status: 'Settled';
    settledAt: Date;
    settledBy: UserRef; // Gestor (R6 Crivo Humano)
  }>;

/**
 * Liquidado a partir de Bank (preserva `TransmissionRecord` + Bank body + settled).
 */
export type SettledFromBankPayable = PayableCore &
  PaidFromBankBody &
  Readonly<{
    status: 'Settled';
    settledAt: Date;
    settledBy: UserRef;
  }>;

/**
 * Union interna do estado `Settled` — preserva sub-tipo de origem (Manual | Bank)
 * para auditoria total (D6 do 000-request).
 */
export type SettledPayable = SettledFromManualPayable | SettledFromBankPayable;

/**
 * União discriminada do agregado `Payable` — 7 variants pelo `status`.
 */
export type Payable =
  | OpenPayable
  | ApprovedPayable
  | TransmittedPayable
  | RejectedPayable
  | OverduePayable
  | PaidPayable
  | SettledPayable;

/**
 * Status derivado da union — 7 variants.
 */
export type PayableStatus = Payable['status'];

/**
 * Input do smart constructor `Payable.open`.
 */
export type OpenPayableInput = Readonly<{
  id: PayableId;
  sourceDocumentId: SourceDocumentRef;
  kind: 'Principal' | 'Tax';
  paymentMethod: 'BankRemittance' | 'ManualExternal';
  beneficiary: BeneficiaryBankData;
  value: Money;
  dueDate: Date;
  openedAt: Date;
}>;
