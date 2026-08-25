/**
 * Adapter in-memory do `SuppliersWithoutContractReader` (DASH-F5 · #242) — driver `memory` da borda
 * HTTP e testes `fastify.inject`.
 *
 * Espelha o contrato do reader real (`openSuppliersWithoutContractReader`, public-api/Drizzle): expõe
 * `list()` (candidatos sem ordem — paridade com o REP-2/#240) e `listTop(limit)` (Top-N por total
 * decrescente, desempate estável por `supplierRef` ASC). Como test double, a ordenação/corte do
 * `listTop` roda em JS — o corte AUTORITATIVO no SQL (`ORDER BY sum DESC … LIMIT ?`) é provado pela
 * suíte de integração Drizzle. `close()` é no-op (sem pool). Molde: `createInMemoryPayableViewStore`.
 */
import { type Result, ok } from '#src/shared/primitives/result.ts';
import type {
  SupplierWithoutContractRow,
  SuppliersWithoutContractReader,
} from '../../../public-api/suppliers-without-contract-projection.ts';

export const createInMemorySuppliersWithoutContractReader = (
  seed: readonly SupplierWithoutContractRow[] = [],
): SuppliersWithoutContractReader => {
  const rows: readonly SupplierWithoutContractRow[] = [...seed];
  const sortedByTotalDesc = (): SupplierWithoutContractRow[] =>
    [...rows].sort((a, b) =>
      // total DESC; empate → supplier_ref ASC (desempate estável, paridade com o SQL).
      b.totalCents !== a.totalCents
        ? b.totalCents - a.totalCents
        : a.supplierRef.localeCompare(b.supplierRef),
    );
  return {
    // #694: o `list` do relatório quebra por plano; este double (usado só pelo Dashboard via `listTop`)
    // não semeia plano → `budgetPlanRef: null`. O corte/ordenação autoritativos são provados na integração.
    list: async () => ok(rows.map((r) => ({ ...r, budgetPlanRef: null }))),
    listTop: async (
      limit: number,
    ): Promise<Result<readonly SupplierWithoutContractRow[], string>> =>
      ok(sortedByTotalDesc().slice(0, Math.max(0, limit))),
    close: async (): Promise<void> => undefined,
  };
};
