import type { Money } from '../../../../shared/kernel/money.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type { ContractRef, BudgetPlanRef, CategoryRef, ProgramRef } from '../shared/refs.ts';
import type { Retention } from '../shared/retention.ts';
import type { RegisteredTax } from '../shared/registered-tax.ts';

export type DocumentType = 'NFS-e' | 'DANFE' | 'RPA' | 'Fatura' | 'Boleto' | 'Recibo' | 'Imposto';

export type PaymentMethod =
  | 'TED'
  | 'TransferenciaBancaria'
  | 'PIX'
  | 'Boleto'
  | 'CartaoCorporativo'
  | 'Cambio'
  | 'GuiaRecolhimento'
  | 'Outro';

// 7 valores desde já (ADR-0005): só Draft/Open/Approved têm transição nesta fatia;
// Transmitted/Refused/Paid/Reconciled são reservados (sem transição).
export type DocumentStatus =
  | 'Draft'
  | 'Open'
  | 'Approved'
  | 'Transmitted'
  | 'Refused'
  | 'Paid'
  | 'Reconciled';

export type DocumentCore = Readonly<{
  id: DocumentId;
  documentNumber: string;
  series: string | null;
  type: DocumentType;
  supplier: SupplierRef;
  contractRef: ContractRef | null;
  budgetPlanRef: BudgetPlanRef | null;
  categoryRef: CategoryRef | null;
  programRef: ProgramRef | null;
  paymentMethod: PaymentMethod;
  grossValue: Money;
  sourceDiscounts: Money;
  retentions: readonly Retention[];
  registeredTaxes: readonly RegisteredTax[];
  discounts: Money;
  penalty: Money;
  interest: Money;
  netValue: Money;
  description: string | null;
  dueDate: Date;
}>;

export type OpenDocument = DocumentCore & Readonly<{ status: 'Open' }>;

export type ApprovedDocument = DocumentCore &
  Readonly<{ status: 'Approved'; approvedAt: Date; approvedBy: UserRef }>;

// Rascunho: persistência temporária parcial (US7). Campos nuláveis até a submissão.
export type DraftDocument = Readonly<{
  id: DocumentId;
  status: 'Draft';
  documentNumber: string | null;
  series: string | null;
  type: DocumentType | null;
  supplier: SupplierRef | null;
  contractRef: ContractRef | null;
  budgetPlanRef: BudgetPlanRef | null;
  categoryRef: CategoryRef | null;
  programRef: ProgramRef | null;
  paymentMethod: PaymentMethod | null;
  grossValue: Money | null;
  sourceDiscounts: Money | null;
  discounts: Money | null;
  penalty: Money | null;
  interest: Money | null;
  retentions: readonly Retention[];
  registeredTaxes: readonly RegisteredTax[];
  dueDate: Date | null;
  description: string | null;
}>;

export type Document = DraftDocument | OpenDocument | ApprovedDocument;
