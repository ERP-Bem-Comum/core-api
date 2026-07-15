import { and, asc, desc, eq, inArray, isNull, sql, type SQL } from 'drizzle-orm';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import process from 'node:process';
import type { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
  ListBudgetPlansQuery,
  BudgetPlanPage,
} from '#src/modules/budget-plans/domain/budget-plan/repository.ts';
import type { BudgetPlansModuleEvent } from '#src/modules/budget-plans/public-api/events.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';
import {
  budgetPlanToInsert,
  budgetToInsert,
  budgetPlanFromRow,
} from '../mappers/budget-plan.mapper.ts';
import { appendOutboxInTx } from './outbox-repository.drizzle.ts';

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, BudgetPlanRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[budget-plan-repo:${ctx}] ${String(cause)}\n`);
    return err('budget-plan-repo-unavailable');
  }
};

const listWhere = (query: ListBudgetPlansQuery): SQL | undefined => {
  const clauses: SQL[] = [];
  if (query.year !== undefined) {
    clauses.push(eq(schema.budgetPlans.year, query.year));
  }
  if (query.status !== undefined) {
    clauses.push(eq(schema.budgetPlans.status, query.status));
  }
  if (query.programRef !== undefined) {
    clauses.push(eq(schema.budgetPlans.programRef, query.programRef as unknown as string));
  }
  // Só raízes (parent_id IS NULL) — usa o índice bgp_budget_plans_parent_id_idx.
  if (query.rootsOnly === true) {
    clauses.push(isNull(schema.budgetPlans.parentId));
  }
  return clauses.length === 0 ? undefined : and(...clauses);
};

const hydrate = (
  row: Readonly<typeof schema.budgetPlans.$inferSelect>,
  budgetRows: readonly Readonly<typeof schema.budgets.$inferSelect>[],
): BudgetPlan => {
  const mapped = budgetPlanFromRow(row, budgetRows);
  if (!mapped.ok) throw new Error(`budget-plan-mapper: ${mapped.error}`);
  return mapped.value;
};

type Db = BudgetPlansMysqlHandle['db'];
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

// Upsert do plano DENTRO de uma tx: trava o cabeçalho (`SELECT id ... FOR UPDATE`), UPDATE-ou-INSERT
// do plano, replace-all dos budgets (coleção pequena, molde do legado) e append no outbox — tudo no
// MESMO commit. Compartilhado por `save` e `removeBudget` (que soma o delete dos results na mesma tx).
const upsertPlanInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: Tx,
  plan: BudgetPlan,
  events: readonly BudgetPlansModuleEvent[],
): Promise<void> => {
  const row = budgetPlanToInsert(plan);
  const existing = await tx
    .select({ id: schema.budgetPlans.id })
    .from(schema.budgetPlans)
    .where(eq(schema.budgetPlans.id, row.id))
    .for('update');

  if (existing.length > 0) {
    await tx.update(schema.budgetPlans).set(row).where(eq(schema.budgetPlans.id, row.id));
  } else {
    await tx.insert(schema.budgetPlans).values(row);
  }

  // Entidade filha reescrita por inteiro (delete+insert) — coleção pequena, sem diff incremental.
  await tx.delete(schema.budgets).where(eq(schema.budgets.budgetPlanId, row.id));
  if (plan.budgets.length > 0) {
    const budgetRows = plan.budgets.map((b) => budgetToInsert(b, plan.id));
    await tx.insert(schema.budgets).values(budgetRows);
  }

  await appendOutboxInTx(tx, schema, events);
};

export const createDrizzleBudgetPlanRepository = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): BudgetPlanRepository => {
  const db = handle.db;

  const budgetsOf = async (
    budgetPlanId: string,
  ): Promise<readonly Readonly<typeof schema.budgets.$inferSelect>[]> =>
    db.select().from(schema.budgets).where(eq(schema.budgets.budgetPlanId, budgetPlanId));

  // Hidratação em lote (evita N+1): 1 SELECT de budgets via inArray para o conjunto de planos.
  // Compartilhada por listPaged + listApprovedByYear.
  const hydrateWithBudgets = async (
    planRows: readonly Readonly<typeof schema.budgetPlans.$inferSelect>[],
  ): Promise<BudgetPlan[]> => {
    if (planRows.length === 0) return [];
    const ids = planRows.map((r) => r.id);
    const budgetRows = await db
      .select()
      .from(schema.budgets)
      .where(inArray(schema.budgets.budgetPlanId, ids));
    const budgetsByPlan = new Map<string, (typeof budgetRows)[number][]>();
    for (const b of budgetRows) {
      const arr = budgetsByPlan.get(b.budgetPlanId) ?? [];
      arr.push(b);
      budgetsByPlan.set(b.budgetPlanId, arr);
    }
    return planRows.map((row) => hydrate(row, budgetsByPlan.get(row.id) ?? []));
  };

  return {
    findById: async (id) =>
      safe('findById', async () => {
        const rows = await db
          .select()
          .from(schema.budgetPlans)
          .where(eq(schema.budgetPlans.id, id as unknown as string))
          .limit(1);
        const row = rows[0];
        if (row === undefined) return null;
        return hydrate(row, await budgetsOf(row.id));
      }),

    listChildren: async (parentId) =>
      safe('listChildren', async () => {
        const rows = await db
          .select()
          .from(schema.budgetPlans)
          .where(eq(schema.budgetPlans.parentId, parentId as unknown as string));
        const children: BudgetPlan[] = [];
        for (const row of rows) {
          children.push(hydrate(row, await budgetsOf(row.id)));
        }
        return children;
      }),

    // Só a RAIZ (parent_id IS NULL) — pós-US4 a família compartilha (year, program_ref).
    findRootByYearAndProgram: async (year, programRef) =>
      safe('findRootByYearAndProgram', async () => {
        const rows = await db
          .select()
          .from(schema.budgetPlans)
          .where(
            and(
              isNull(schema.budgetPlans.parentId),
              eq(schema.budgetPlans.year, year),
              eq(schema.budgetPlans.programRef, programRef as unknown as string),
            ),
          )
          .limit(1);
        const row = rows[0];
        if (row === undefined) return null;
        return hydrate(row, await budgetsOf(row.id));
      }),

    listPaged: async (query): Promise<Result<BudgetPlanPage, BudgetPlanRepositoryError>> =>
      safe('listPaged', async () => {
        const where = listWhere(query);
        const totalRows = await db
          .select({ total: sql<number>`count(*)` })
          .from(schema.budgetPlans)
          .where(where);
        const total = totalRows[0]?.total ?? 0;

        const offset = (query.page - 1) * query.limit;
        const planRows = await db
          .select()
          .from(schema.budgetPlans)
          .where(where)
          .orderBy(desc(schema.budgetPlans.updatedAt))
          .limit(query.limit)
          .offset(offset);

        if (planRows.length === 0) return { items: [], total };
        return { items: await hydrateWithBudgets(planRows), total };
      }),

    // Todos os APROVADOS do ano [, programa] — raiz E calibrações/cenários; ORDER BY id (a vigência
    // por família é resolvida a jusante por selectCurrentApprovedByFamily). US5 (decisão Vigente).
    listApprovedByYear: async (query) =>
      safe('listApprovedByYear', async () => {
        const clauses: SQL[] = [
          eq(schema.budgetPlans.status, 'APROVADO'),
          eq(schema.budgetPlans.year, query.year),
        ];
        if (query.programRef !== undefined) {
          clauses.push(eq(schema.budgetPlans.programRef, query.programRef as unknown as string));
        }
        const planRows = await db
          .select()
          .from(schema.budgetPlans)
          .where(and(...clauses))
          .orderBy(asc(schema.budgetPlans.id));
        return hydrateWithBudgets(planRows);
      }),

    listYears: async () =>
      safe('listYears', async () => {
        const rows = await db
          .selectDistinct({ year: schema.budgetPlans.year })
          .from(schema.budgetPlans)
          .orderBy(asc(schema.budgetPlans.year));
        return rows.map((r) => r.year);
      }),

    save: async (plan, events) =>
      safe('save', async () => {
        await db.transaction(async (tx) => {
          await upsertPlanInTx(tx, plan, events);
        });
      }),

    // Remoção atômica: upsert do plano-sem-o-budget + delete dos resultados dependentes na MESMA tx.
    // Se o delete (ou o upsert/outbox) falha, a tx faz rollback total — nada órfão, nada removido.
    removeBudget: async (plan, budgetId, events) =>
      safe('removeBudget', async () => {
        await db.transaction(async (tx) => {
          await upsertPlanInTx(tx, plan, events);
          // bgp_budget_results sem FK cascade (D1: o pai sofre replace-all) — delete explícito na tx.
          await tx
            .delete(schema.budgetResults)
            .where(eq(schema.budgetResults.budgetId, budgetId as unknown as string));
        });
      }),
  };
};
