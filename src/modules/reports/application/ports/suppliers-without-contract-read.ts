/**
 * SUPPLIERS-WITHOUT-CONTRACT-READ — Port de LEITURA (read-only) do relatório "Fornecedores sem
 * Contrato" (REP-2 · #240).
 *
 * Agrega payables `contract_ref IS NULL` por fornecedor (soma/contagem) — lido da projeção
 * `fin_payable_view` do financial via ACL. `name` pode ser `null` (fornecedor ainda não projetado
 * em `fin_supplier_view`). Consumido pela borda HTTP (`GET /reports/suppliers-without-contract`).
 */
import type { Result } from '#src/shared/primitives/result.ts';

// #694: uma linha por fornecedor×Plano Orçamentário. `budgetPlanRef` opaco (o rótulo é costurado na
// borda via `budget-plans/public-api`, como a Análise).
export type SupplierWithoutContract = Readonly<{
  supplierRef: string;
  name: string | null;
  totalCents: number;
  payableCount: number;
  budgetPlanRef: string | null;
}>;

// #694: filtros de servidor (paridade #588/#682). Espelha `SuppliersWithoutContractFilter` do financial.
export type SuppliersWithoutContractFilter = Readonly<{
  programRef?: string;
  budgetPlanRef?: string;
  costCenterRef?: string;
  categoryRef?: string;
  subcategoryRef?: string;
  dueFrom?: string;
  dueTo?: string;
}>;

export type SuppliersWithoutContractReadError = 'suppliers-without-contract-read-unavailable';

export type SuppliersWithoutContractReadPort = Readonly<{
  list: (
    filter: SuppliersWithoutContractFilter,
  ) => Promise<Result<readonly SupplierWithoutContract[], SuppliersWithoutContractReadError>>;
}>;
