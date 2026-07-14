/**
 * SUPPLIERS-WITHOUT-CONTRACT-READ — Port de LEITURA (read-only) do relatório "Fornecedores sem
 * Contrato" (REP-2 · #240).
 *
 * Agrega payables `contract_ref IS NULL` por fornecedor (soma/contagem) — lido da projeção
 * `fin_payable_view` do financial via ACL. `name` pode ser `null` (fornecedor ainda não projetado
 * em `fin_supplier_view`). Consumido pela borda HTTP (`GET /reports/suppliers-without-contract`).
 */
import type { Result } from '#src/shared/primitives/result.ts';

export type SupplierWithoutContract = Readonly<{
  supplierRef: string;
  name: string | null;
  totalCents: number;
  payableCount: number;
}>;

export type SuppliersWithoutContractReadError = 'suppliers-without-contract-read-unavailable';

export type SuppliersWithoutContractReadPort = Readonly<{
  list: () => Promise<
    Result<readonly SupplierWithoutContract[], SuppliersWithoutContractReadError>
  >;
}>;
