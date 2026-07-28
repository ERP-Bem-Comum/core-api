/**
 * GENERAL-REPORT-READ — Port de LEITURA (read-only) do "Relatório Geral" (REP-6 · #442 · Slice A).
 *
 * Linhas PLANAS PAGINADAS de títulos a-pagar, lidas do `financial` via ACL (fin_payable_view +
 * LEFT JOINs same-module). Grão = 1 linha por payable (sem agregação). Refs/nomes podem ser `null`
 * (payable sem fornecedor/CC/categoria/subcategoria; nome ainda não projetado — degradação graciosa).
 * Consumido pela borda HTTP (`GET /reports/generalReport`).
 *
 * Slice B (#442) soma FINANCIADOR e COLABORADOR (nomes) via stitch cross-módulo com `partners`
 * (ADR-0006) — o financial entrega `payeeKind` + `supplierRef`; o nome é resolvido na borda.
 *
 * Slice C (#442) soma PIX e Bancários (`pixKey`/`bankAccount`), também via stitch com `partners`
 * (`getSupplierView`) — existem SÓ em `Supplier`, logo só se preenchem para linhas `supplier`
 * (financier/collaborator/act → null). Redação campo-a-campo por RBAC: a resolução só acontece
 * quando o caller tem `bank-account:read` (opções `{ includeBankData }`); sem a permissão, ambos
 * saem `null` e o relatório retorna 200 normal. Número do Contrato (Slice D) ainda NÃO faz parte
 * deste shape.
 *
 * O filtro (todos os campos opcionais, ausente = sem restrição, AND) e a paginação são repassados
 * ao reader do financial; aqui os valores são strings/números opacos (validados na borda).
 */
import type { Result } from '#src/shared/primitives/result.ts';
// Slice C (#442): PIX/Bancário são shapes cross-módulo do `partners` (existem só em `Supplier`).
// Import via public-api é permitido (ADR-0006) — o payee-bank-composition do financial já faz isso.
import type { BankAccount, PixKey } from '#src/modules/partners/public-api/index.ts';

export type GeneralReportOrder = 'dueDate:asc' | 'dueDate:desc';

export type GeneralReportFilter = Readonly<{
  programRef?: string;
  budgetPlanRef?: string;
  dueFrom?: string; // 'YYYY-MM-DD' inclusivo (half-open [dueFrom, dueTo) sobre due_date)
  dueTo?: string; // 'YYYY-MM-DD' exclusivo
  debitAccountRef?: string; // → fin_payable_view.debit_account_ref
  costCenterRef?: string;
  categoryRef?: string;
  subcategoryRef?: string;
  supplierRef?: string;
  status?: string; // 1 dos 6 DocumentStatus granulares (validado na borda) → fin_documents.status
  search?: string; // LIKE contains em document_number + fin_supplier_view.name
  order?: GeneralReportOrder; // default 'dueDate:desc'
}>;

export type GeneralReportPagination = Readonly<{ page: number; limit: number }>;

export type GeneralReportRow = Readonly<{
  payableId: string;
  documentId: string;
  code: string | null;
  tipo: 'a-pagar';
  dueDate: string;
  // Slice B (#442): tipo do favorecido (do financial) + NOMES cross-módulo costurados via partners.
  // Por kind: supplier → só supplierName; financier → só financierName; collaborator → só
  // collaboratorName; act → nenhum nome (todos null). Degradação graciosa: ref não resolvido → null.
  payeeKind: 'supplier' | 'financier' | 'act' | 'collaborator';
  supplierRef: string | null;
  supplierName: string | null;
  financierName: string | null;
  collaboratorName: string | null;
  costCenterRef: string | null;
  costCenterName: string | null;
  categoryRef: string | null;
  categoryName: string | null;
  subcategoryRef: string | null;
  subcategoryName: string | null;
  valueCents: number;
  contractRef: string | null;
  // Slice C (#442): PIX + Dados Bancários do favorecido. Só preenchidos para `payeeKind === 'supplier'`
  // com `supplierRef` resolvível E quando o caller tem `bank-account:read`; caso contrário, ambos null.
  pixKey: PixKey | null;
  bankAccount: BankAccount | null;
}>;

// Página read-model (molde `Page<T>` de financial/domain/document/query.ts — replicado aqui para
// não cruzar a fronteira de módulo com financial/domain, ADR-0006).
export type GeneralReportPage = Readonly<{
  items: readonly GeneralReportRow[];
  page: number;
  pageSize: number;
  total: number;
}>;

export type GeneralReportReadError = 'general-report-read-unavailable';

// Slice C (#442): gate de redação campo-a-campo. `includeBankData: false` ⇒ o adapter NEM resolve
// PIX/banco (não chama `getSupplierView`), deixando `pixKey`/`bankAccount` null em todas as linhas.
export type GeneralReportReadOptions = Readonly<{ includeBankData: boolean }>;

export type GeneralReportReadPort = Readonly<{
  list: (
    filter: GeneralReportFilter,
    pagination: GeneralReportPagination,
    options: GeneralReportReadOptions,
  ) => Promise<Result<GeneralReportPage, GeneralReportReadError>>;
}>;
