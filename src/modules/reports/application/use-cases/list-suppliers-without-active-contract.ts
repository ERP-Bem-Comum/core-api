/**
 * Relatório "Fornecedores sem Contrato" (#437) — anti-join EM MEMÓRIA.
 *
 * Candidatos do `financial` (payables `contract_ref IS NULL`, `kind='Parent'`) MENOS os
 * fornecedores com contrato `Active` no `contracts`. Responde "fornecedor sem NENHUM contrato
 * ativo" — não "fornecedor com ALGUM título sem contrato".
 *
 * A subtração é em memória porque o JOIN `ctr_*` × `fin_*` é proibido (ADR-0006 `:150`/`:154`,
 * ADR-0014 `:130`); orquestrar dois read-ports de public-api é o mecanismo que o ADR-0006 `:80`
 * autoriza.
 */
import { type Result, ok } from '#src/shared/primitives/result.ts';
import type {
  SupplierWithoutContract,
  SuppliersWithoutContractReadError,
  SuppliersWithoutContractReadPort,
} from '../ports/suppliers-without-contract-read.ts';
import type {
  ActiveContractorReadError,
  ActiveContractorReadPort,
} from '../ports/active-contractor-read.ts';

export type ListSuppliersWithoutActiveContractError =
  | SuppliersWithoutContractReadError
  | ActiveContractorReadError;

type Deps = Readonly<{
  suppliersRead: SuppliersWithoutContractReadPort;
  activeContractorsRead: ActiveContractorReadPort;
}>;

export const listSuppliersWithoutActiveContract =
  (deps: Deps) =>
  async (): Promise<
    Result<readonly SupplierWithoutContract[], ListSuppliersWithoutActiveContractError>
  > => {
    const candidates = await deps.suppliersRead.list();
    if (!candidates.ok) return candidates;

    const withActiveContract = await deps.activeContractorsRead.listContractorsWithActiveContract();
    // Fail-closed: servir os candidatos sem subtrair exporia fornecedores COM contrato — exatamente
    // o defeito que este relatório existe para corrigir. Sem o conjunto ativo, não há relatório.
    if (!withActiveContract.ok) return withActiveContract;

    const excluded = new Set(withActiveContract.value);
    return ok(candidates.value.filter((supplier) => !excluded.has(supplier.supplierRef)));
  };
