/**
 * Reader boot-scoped do "Realizado vs Provisionado" (FIN-REALIZED-PROVISIONED-READ · fatia 2/3 de
 * REPORTS-REALIZED-VS-PLANNED · #416) — public-api do financial.
 *
 * Agrega DUAS medidas por `(budgetPlanRef, categoryRef, mês)`, cada uma no seu eixo de data
 * (decisão da P.O. 2026-07-20):
 *   - Realizado    = Σ `fin_reconciliation_items.reconciled_value_cents` de reconciliações
 *                    `status='Active'` (inclui parciais — soma o valor CONCILIADO, não o do título;
 *                    exclui `Undone`). Mês = `DATE_FORMAT(fin_reconciliations.reconciled_at,'%Y-%m')`.
 *   - Provisionado = títulos `fin_payables.status='Approved'` SEM item de conciliação `Active`
 *                    (anti-join defensivo — ver abaixo). Mês = `DATE_FORMAT(fin_payables.due_date,'%Y-%m')`.
 *
 * Por que DUAS queries unidas em memória (e não um FROM único): os eixos de data são independentes
 * (realizado por `reconciled_at`, provisionado por `due_date`). Um FROM único cruzaria os dois eixos
 * numa mesma linha e duplicaria/deslocaria buckets. Cada medida é agregada no seu próprio grão e
 * depois costurada por `(budgetPlanRef, categoryRef, mês)` — soma disjunta, sem fan-out cruzado.
 *
 * Anti-join do provisionado: `status='Approved'` já exclui, por construção, títulos com conciliação
 * Active (um título conciliado migra para `Reconciled`/`PartiallyReconciled`). Ainda assim o
 * `NOT EXISTS` explícito protege contra qualquer `Approved` que carregue item Active por
 * inconsistência de dado — sem ele o invariante ⊻ (CA4) dependeria só do status. `NOT EXISTS` (e não
 * LEFT JOIN ... IS NULL) evita fan-out quando um título tem múltiplos itens de conciliação.
 *
 * JOIN base intra-financial (o mesmo do #416; zero acoplamento cross-módulo — ADR-0006/0014):
 *   fin_reconciliation_items → fin_reconciliations → fin_payables → fin_documents
 *   (budget_plan_ref, category_ref). `budgetPlanRef`/`categoryRef` são refs OPACOS — nenhum nome
 *   resolvido aqui (nenhuma tabela de outro módulo tocada).
 *
 * **Boot-scoped:** pool aberto uma vez, fechado no `close()` (incidente RDS 0001).
 *
 * ADR-0020 §"Features permitidas": INNER JOIN, agregação (SUM/GROUP BY), funções de data
 * (`DATE_FORMAT`/`YEAR`), subquery `NOT EXISTS`.
 */
import { and, eq, notExists, sql } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { openMysqlFinancial } from '../adapters/persistence/drivers/mysql-driver.ts';
import {
  finDocuments,
  finPayables,
  finReconciliations,
  finReconciliationItems,
} from '../adapters/persistence/schemas/mysql.ts';

export type RealizedProvisionedRow = Readonly<{
  budgetPlanRef: string;
  categoryRef: string | null; // documento pode não ter categoria
  month: string; // 'YYYY-MM'
  realizedCents: number;
  provisionedCents: number;
}>;

export type RealizedProvisionedReader = Readonly<{
  list: (
    filter: Readonly<{ budgetPlanRef?: string; year?: number }>,
  ) => Promise<Result<readonly RealizedProvisionedRow[], string>>;
  close: () => Promise<void>;
}>;

// Chave de costura (plano, categoria, mês). O separador `|` não ocorre em UUID nem em
// 'YYYY-MM', então a decomposição é inequívoca mesmo se um ref deixar de ser UUID de largura
// fixa. Categoria ausente vira sentinela própria, distinta de qualquer categoryRef presente.
const NULL_CATEGORY = '\u0000';
const keyOf = (budgetPlanRef: string, categoryRef: string | null, month: string): string =>
  `${budgetPlanRef}|${categoryRef ?? NULL_CATEGORY}|${month}`;

interface Bucket {
  budgetPlanRef: string;
  categoryRef: string | null;
  month: string;
  realizedCents: number;
  provisionedCents: number;
}

const bucketFor = (
  acc: Map<string, Bucket>,
  budgetPlanRef: string,
  categoryRef: string | null,
  month: string,
): Bucket => {
  const key = keyOf(budgetPlanRef, categoryRef, month);
  const existing = acc.get(key);
  if (existing !== undefined) return existing;
  const created: Bucket = {
    budgetPlanRef,
    categoryRef,
    month,
    realizedCents: 0,
    provisionedCents: 0,
  };
  acc.set(key, created);
  return created;
};

export const openRealizedProvisionedReader = async (
  opts: Readonly<{ connectionString: string }>,
): Promise<Result<RealizedProvisionedReader, string>> => {
  const handleR = await openMysqlFinancial({
    connectionString: opts.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) return err(handleR.error);
  const handle = handleR.value;
  const { db } = handle;

  return ok({
    list: async (filter) => {
      try {
        // ── Realizado: mês vindo de reconciled_at; só reconciliações Active. ─────────────────────
        const realizedMonth = sql<string>`date_format(${finReconciliations.reconciledAt}, '%Y-%m')`;
        const realizedRows = await db
          .select({
            budgetPlanRef: finDocuments.budgetPlanRef,
            categoryRef: finDocuments.categoryRef,
            month: realizedMonth,
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
          .where(
            and(
              filter.budgetPlanRef !== undefined
                ? eq(finDocuments.budgetPlanRef, filter.budgetPlanRef)
                : undefined,
              filter.year !== undefined
                ? sql`year(${finReconciliations.reconciledAt}) = ${filter.year}`
                : undefined,
            ),
          )
          .groupBy(finDocuments.budgetPlanRef, finDocuments.categoryRef, realizedMonth);

        // ── Provisionado: mês vindo de due_date; Approved SEM conciliação Active (anti-join). ────
        const provisionedMonth = sql<string>`date_format(${finPayables.dueDate}, '%Y-%m')`;
        const provisionedRows = await db
          .select({
            budgetPlanRef: finDocuments.budgetPlanRef,
            categoryRef: finDocuments.categoryRef,
            month: provisionedMonth,
            provisionedCents: sql<string>`sum(${finPayables.value})`,
          })
          .from(finPayables)
          .innerJoin(finDocuments, eq(finDocuments.id, finPayables.documentId))
          .where(
            and(
              eq(finPayables.status, 'Approved'),
              notExists(
                db
                  .select({ one: sql`1` })
                  .from(finReconciliationItems)
                  .innerJoin(
                    finReconciliations,
                    eq(finReconciliations.id, finReconciliationItems.reconciliationId),
                  )
                  .where(
                    and(
                      eq(finReconciliationItems.payableId, finPayables.id),
                      eq(finReconciliations.status, 'Active'),
                    ),
                  ),
              ),
              filter.budgetPlanRef !== undefined
                ? eq(finDocuments.budgetPlanRef, filter.budgetPlanRef)
                : undefined,
              filter.year !== undefined
                ? sql`year(${finPayables.dueDate}) = ${filter.year}`
                : undefined,
            ),
          )
          .groupBy(finDocuments.budgetPlanRef, finDocuments.categoryRef, provisionedMonth);

        // ── Costura em memória por (plano, categoria, mês). ──────────────────────────────────────
        const acc = new Map<string, Bucket>();
        for (const row of realizedRows) {
          // budget_plan_ref é nullable no schema; relatório é POR plano → linha sem plano fica fora.
          if (row.budgetPlanRef === null) continue;
          bucketFor(acc, row.budgetPlanRef, row.categoryRef, row.month).realizedCents += Number(
            row.realizedCents,
          );
        }
        for (const row of provisionedRows) {
          if (row.budgetPlanRef === null) continue;
          bucketFor(acc, row.budgetPlanRef, row.categoryRef, row.month).provisionedCents += Number(
            row.provisionedCents,
          );
        }

        return ok([...acc.values()]);
      } catch (cause) {
        process.stderr.write(`[fin-realized-provisioned:list] ${String(cause)}\n`);
        return err('realized-provisioned-read-failure');
      }
    },
    close: async () => handle.close(),
  });
};
