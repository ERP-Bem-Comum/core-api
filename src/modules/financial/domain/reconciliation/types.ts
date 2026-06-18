import type { PayableId } from '../shared/payable-id.ts';
import type { StatementTransactionId } from '../statement/statement-transaction-id.ts';
import type { DocumentStatus } from '../document/types.ts';
import type { ReconciliationId } from './reconciliation-id.ts';
import type { ManualEntryId } from './manual-entry-id.ts';
import type { ReconciliationEvent } from './events.ts';

// Valores em EN (C1 — casam com fin_payables.status). Tradução PT é apresentação.
export type ReconciliationType = 'Individual' | 'Multiple' | 'Partial' | 'ManualEntry';
export type ReconciliationStatus = 'Active' | 'Undone';
export type DifferenceTreatment = 'Interest' | 'Penalty' | 'Discount' | 'Fee' | 'Partial';

// Lançamento manual (US5): registro financeiro sem título de origem (ex.: tarifa). Parte do boundary
// da Reconciliation quando `type = ManualEntry`.
export type ManualEntryType =
  | 'Payment'
  | 'Receipt'
  | 'Transfer'
  | 'FeePenaltyInterest'
  | 'Investment'
  | 'Redemption';

export type ManualEntry = Readonly<{
  id: ManualEntryId;
  type: ManualEntryType;
  valueCents: number;
  supplierRef: string | null;
  categoryRef: string | null;
  costCenterRef: string | null;
  programRef: string | null;
  description: string | null;
}>;

// Foto do título no momento da conciliação (referência por identidade — D-AGGREGATES).
export type PayableSnapshot = Readonly<{
  id: PayableId;
  status: DocumentStatus;
  valueCents: number;
}>;

export type ReconciliationItem = Readonly<{
  payableId: PayableId;
  reconciledValueCents: number;
}>;

// Convenção de sinal de `valueCents` (handoff p/ #123): **positivo** soma ao fechamento
// (`Interest`/`Penalty`/`Fee`, transação > títulos); **negativo** para `Discount` (transação < títulos).
// Invariante R3: `Σ itens.reconciledValueCents + difference.valueCents === transação`. O lançamento
// contábil da diferença (LancamentoManual) é orquestrado pelo use-case no #123.
export type Difference = Readonly<{
  valueCents: number;
  treatment: DifferenceTreatment;
}>;

export type ReconciliationAudit = Readonly<{
  reconciledAt: Date;
  reconciledBy: string;
  undoneAt: Date | null;
  undoneBy: string | null;
  undoReason: string | null;
}>;

export type Reconciliation = Readonly<{
  id: ReconciliationId;
  transactionId: StatementTransactionId;
  type: ReconciliationType;
  status: ReconciliationStatus;
  items: readonly ReconciliationItem[];
  difference: Difference | null;
  // Preenchido só quando `type = ManualEntry` (US5); null nas conciliações com título.
  manualEntry: ManualEntry | null;
  audit: ReconciliationAudit;
}>;

export type ConfirmInput = Readonly<{
  reconciliationId: ReconciliationId;
  transactionId: StatementTransactionId;
  transactionValueCents: number;
  payables: readonly PayableSnapshot[];
  difference?: Difference;
  reconciledBy: string;
  occurredAt: Date;
}>;

export type ConfirmOutput = Readonly<{
  reconciliation: Reconciliation;
  events: readonly ReconciliationEvent[];
}>;

export type UndoInput = Readonly<{
  undoneBy: string;
  occurredAt: Date;
  reason?: string;
}>;

export type UndoOutput = Readonly<{
  reconciliation: Reconciliation;
  events: readonly ReconciliationEvent[];
}>;
