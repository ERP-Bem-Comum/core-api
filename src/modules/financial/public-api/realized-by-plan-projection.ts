/**
 * Reader boot-scoped do "Realizado por Plano Orçamentário" (BGP-INSIGHTS-REALIZED · #416) —
 * public-api do financial.
 *
 * O Realizado de um plano = Σ dos `reconciled_value_cents` das reconciliações **Active** dos
 * títulos cujo documento tem `budget_plan_ref = id do plano` (inclui parciais — o valor
 * conciliado, não o do título — e exclui `Undone`). JOIN 3-hop **intra-financial** (permitido —
 * ADR-0006/0014; zero acoplamento a outro módulo):
 *   fin_reconciliation_items → fin_reconciliations (status='Active') → fin_payables (document_id)
 *   → fin_documents (budget_plan_ref).
 *
 * **Boot-scoped:** pool aberto uma vez, fechado no `close()` (incidente RDS 0001). O consumidor
 * (budget-plans) recebe a função `getByPlans` já ligada via ACL — nunca a connection-string.
 * Batch por conjunto de refs (anti-N+1): refs vazio devolve Map vazio SEM rodar `IN ()`.
 *
 * ADR-0020 §"Features permitidas": INNER JOIN, IN (`inArray`), agregação (SUM/GROUP BY).
 */
import { and, eq, inArray, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { openMysqlFinancial } from '../adapters/persistence/drivers/mysql-driver.ts';
import {
  finDocuments,
  finPayables,
  finReconciliations,
  finReconciliationItems,
} from '../adapters/persistence/schemas/mysql.ts';

export type RealizedByPlanReader = Readonly<{
  // Realizado (centavos) por `budget_plan_ref`. Ref sem conciliação Active fica AUSENTE do Map
  // (o consumidor trata ausente como 0).
  getByPlans: (refs: readonly string[]) => Promise<Result<ReadonlyMap<string, number>, string>>;
  close: () => Promise<void>;
}>;

export const openRealizedByPlanReader = async (
  opts: Readonly<{ connectionString: string }>,
): Promise<Result<RealizedByPlanReader, string>> => {
  const handleR = await openMysqlFinancial({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  const { db } = handle;

  return ok({
    getByPlans: async (refs) => {
      // IN () é SQL inválido — curto-circuita antes de tocar o banco.
      if (refs.length === 0) return ok(new Map<string, number>());
      try {
        const rows = await db
          .select({
            ref: finDocuments.budgetPlanRef,
            // mysql2 devolve SUM (bigint agregado) como string → Number() no mapper.
            realizedCents: sql<string>`sum(${finReconciliationItems.reconciledValueCents})`,
          })
          .from(finReconciliationItems)
          .innerJoin(
            finReconciliations,
            and(
              eq(finReconciliations.id, finReconciliationItems.reconciliationId),
              eq(finReconciliations.status, 'Active'),
            ),
          )
          .innerJoin(finPayables, eq(finPayables.id, finReconciliationItems.payableId))
          .innerJoin(finDocuments, eq(finDocuments.id, finPayables.documentId))
          .where(inArray(finDocuments.budgetPlanRef, refs))
          .groupBy(finDocuments.budgetPlanRef);

        const result = new Map<string, number>();
        for (const row of rows) {
          // `budget_plan_ref` é nullable no schema; o `inArray` já exclui NULL, mas o tipo mantém.
          if (row.ref === null) continue;
          result.set(row.ref, Number(row.realizedCents));
        }
        return ok(result);
      } catch (cause) {
        process.stderr.write(`[fin-realized-by-plan:getByPlans] ${String(cause)}\n`);
        return err('realized-by-plan-read-failure');
      }
    },
    close: async () => handle.close(),
  });
};
