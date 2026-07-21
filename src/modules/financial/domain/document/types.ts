import type { Money } from '../../../../shared/kernel/money.ts';
import type { Competencia } from './competencia.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { SupplierRef } from '#src/modules/partners/public-api/refs.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type {
  ContractRef,
  BudgetPlanRef,
  CategoryRef,
  SubcategoryRef,
  CostCenterRef,
  ProgramRef,
} from '../shared/refs.ts';
import type { Retention } from '../shared/retention.ts';
import type { RegisteredTax } from '../shared/registered-tax.ts';
import type { SourceFileRef } from './source-file-ref.ts';

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
// PartiallyReconciled (#141/#247): título com pagamento parcial conciliado (saldo aberto remanescente);
// status DERIVADO da soma conciliada (ver domain/payable/reconciled-status.ts).
export type DocumentStatus =
  | 'Draft'
  | 'Open'
  | 'Approved'
  | 'Transmitted'
  | 'Refused'
  | 'Paid'
  | 'PartiallyReconciled'
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
  subcategoryRef: SubcategoryRef | null; // #502: folha da árvore do plano (carimbo da subcategoria)
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
  // Aprovador PRETENDIDO definido na inclusão (#148). Distinto de `approvedBy` (preenchido na
  // aprovação efetiva). A aprovação segue sendo ação separada — este campo é só o destinatário.
  approverRef: UserRef | null;
  accessKey: string | null; // #115: chave de acesso (44 dígitos) da DANFE; null nos demais tipos
  competencia: Competencia | null; // #197: mês contábil de referência
  debitAccountRef: string | null; // #197: conta-débito (ref → fin_cedente_accounts)
  paymentDetail: string | null; // #273: complemento da forma de pagamento (linha digitável, referência de câmbio etc.)
  sourceFileRef: SourceFileRef | null; // #62: comprovante-fonte (PDF/XML lido) guardado no storage
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
  subcategoryRef: SubcategoryRef | null; // #502: folha da árvore do plano (opcional no rascunho)
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
  approverRef: UserRef | null; // #148: aprovador pretendido (opcional no rascunho)
  accessKey: string | null; // #115: chave de acesso (opcional no rascunho)
  competencia: Competencia | null; // #197 (opcional no rascunho)
  debitAccountRef: string | null; // #197 (opcional no rascunho)
  paymentDetail: string | null; // #273 (opcional no rascunho)
  sourceFileRef: SourceFileRef | null; // #62: comprovante-fonte (opcional no rascunho)
}>;

export type Document = DraftDocument | OpenDocument | ApprovedDocument;
