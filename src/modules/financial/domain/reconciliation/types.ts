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
  // #502/S2: taxonomia planejável no título manual (plano + subcategoria), ao lado dos irmãos.
  budgetPlanRef: string | null;
  subcategoryRef: string | null;
  categoryRef: string | null;
  costCenterRef: string | null;
  programRef: string | null;
  description: string | null;
  // #143: realocação patrimonial. `destinationAccountRef` = outra fin_cedente_account (Transfer);
  // `productLabel` = produto livre (Investment/Redemption). Null nos demais tipos.
  destinationAccountRef: string | null;
  productLabel: string | null;
  // #370: campos de documento (rastreabilidade). `documentValueCents` default = valor da transação
  // conciliada (`valueCents`); pode divergir (multa/juros/complemento). Metadado — não altera o realizado.
  documentNumber: string | null;
  documentType: string | null;
  issueDate: Date | null;
  documentValueCents: number | null;
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
// #141/#247: a diferença classificada (`Interest|Penalty|Fee|Discount`) pode carregar a classificação
// contábil (centro de custo / categoria / observação) usada para gerar o `ManualEntry` vinculado. Campos
// opcionais — `Partial` (saldo aberto) não gera lançamento. Reuso de `ManualEntry` (decisão b, DRY/YAGNI).
export type Difference = Readonly<{
  valueCents: number;
  treatment: DifferenceTreatment;
  categoryRef?: string;
  costCenterRef?: string;
  note?: string;
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

// Alocação parcial por título (#141/#247): valor REAL conciliado contra um título específico. Quando
// ausente para um título, concilia o valor cheio (`payable.valueCents`) — back-compat (CA1).
export type ReconciliationAllocation = Readonly<{
  payableId: PayableId;
  reconciledValueCents: number;
}>;

export type ConfirmInput = Readonly<{
  reconciliationId: ReconciliationId;
  transactionId: StatementTransactionId;
  transactionValueCents: number;
  payables: readonly PayableSnapshot[];
  difference?: Difference;
  // #141/#247: alocação parcial por título. Ausente → conciliação cheia (CA1).
  allocations?: readonly ReconciliationAllocation[];
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
