import type { Money } from '../../../../shared/kernel/money.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type {
  ContractRef,
  BudgetPlanRef,
  CategoryRef,
  CostCenterRef,
  ProgramRef,
} from '../shared/refs.ts';
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

// Tipo do favorecido (#90): o documento aponta para um parceiro (`supplier` — ref por formato, sem
// acoplamento ao domínio dono). `payeeKind` registra QUAL tipo de parceiro é, já que o id sozinho
// não distingue. Default 'supplier' (back-compat com documentos pré-#90).
export type PayeeKind = 'supplier' | 'financier' | 'act' | 'collaborator';

export const PAYEE_KINDS = ['supplier', 'financier', 'act', 'collaborator'] as const;

export const isPayeeKind = (v: string): v is PayeeKind =>
  (PAYEE_KINDS as readonly string[]).includes(v);

export type DocumentCore = Readonly<{
  id: DocumentId;
  documentNumber: string;
  series: string | null;
  type: DocumentType;
  supplier: SupplierRef;
  payeeKind: PayeeKind;
  contractRef: ContractRef | null;
  budgetPlanRef: BudgetPlanRef | null;
  categoryRef: CategoryRef | null;
  costCenterRef: CostCenterRef | null;
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
  // Data de EMISSÃO do documento (#163) — capturada no create (OCR/manual). Nullable: opcional e
  // back-compat com documentos pré-existentes. Distinta de `dueDate` (vencimento).
  issueDate: Date | null;
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
  payeeKind: PayeeKind | null;
  contractRef: ContractRef | null;
  budgetPlanRef: BudgetPlanRef | null;
  categoryRef: CategoryRef | null;
  costCenterRef: CostCenterRef | null;
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
  issueDate: Date | null; // #163: emissão (opcional no rascunho)
}>;

export type Document = DraftDocument | OpenDocument | ApprovedDocument;
