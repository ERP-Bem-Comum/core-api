import { and, asc, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import process from 'node:process';
import type { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
  ListBudgetPlansQuery,
  BudgetPlanPage,
} from '#src/modules/budget-plans/domain/budget-plan/repository.ts';
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

export const createDrizzleBudgetPlanRepository = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): BudgetPlanRepository => {
  const db = handle.db;

  const budgetsOf = async (
    budgetPlanId: string,
  ): Promise<readonly Readonly<typeof schema.budgets.$inferSelect>[]> =>
    db.select().from(schema.budgets).where(eq(schema.budgets.budgetPlanId, budgetPlanId));

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

    findRootByYearAndProgram: async (year, programRef) =>
      safe('findRootByYearAndProgram', async () => {
        const rows = await db
          .select()
          .from(schema.budgetPlans)
          .where(
            and(
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

        const items = planRows.map((row) => hydrate(row, budgetsByPlan.get(row.id) ?? []));
        return { items, total };
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

          // Entidade filha reescrita por inteiro (delete+insert) — coleção pequena,
          // sem necessidade de diff incremental (molde do plano orçamentário legado).
          await tx.delete(schema.budgets).where(eq(schema.budgets.budgetPlanId, row.id));
          if (plan.budgets.length > 0) {
            const budgetRows = plan.budgets.map((b) => budgetToInsert(b, plan.id));
            await tx.insert(schema.budgets).values(budgetRows);
          }

          await appendOutboxInTx(tx, schema, events);
        });
      }),
  };
};
