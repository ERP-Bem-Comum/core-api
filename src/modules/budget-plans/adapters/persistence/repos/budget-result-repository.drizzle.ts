import { eq } from 'drizzle-orm';
import process from 'node:process';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { BudgetId } from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import type { BudgetResult } from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import type {
  BudgetResultRepository,
  BudgetResultRepositoryError,
} from '#src/modules/budget-plans/domain/budget-result/repository.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';
import { budgetResultToInsert, budgetResultFromRow } from '../mappers/budget-result.mapper.ts';

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, BudgetResultRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[budget-result-repo:${ctx}] ${String(cause)}\n`);
    return err('budget-result-repo-unavailable');
  }
};

export const createDrizzleBudgetResultRepository = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): BudgetResultRepository => {
  const db = handle.db;

  return {
    add: async (result: BudgetResult) =>
      safe('add', async () => {
        await db.insert(schema.budgetResults).values(budgetResultToInsert(result));
      }),

    // Leitura com ORDER BY id determinístico (paridade com o in-memory na suíte). O mapper blinda
    // cada row; qualquer corrupção -> erro único (não devolve resultado parcial).
    listByBudgetId: async (
      budgetId: BudgetId,
    ): Promise<Result<readonly BudgetResult[], BudgetResultRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(schema.budgetResults)
          .where(eq(schema.budgetResults.budgetId, budgetId as unknown as string))
          .orderBy(schema.budgetResults.id);

        const results: BudgetResult[] = [];
        for (const row of rows) {
          const mapped = budgetResultFromRow(row);
          if (!mapped.ok) return err('budget-result-corrupt');
          results.push(mapped.value);
        }
        return ok(results);
      } catch (cause) {
        process.stderr.write(`[budget-result-repo:listByBudgetId] ${String(cause)}\n`);
        return err('budget-result-repo-unavailable');
      }
    },

    // CA4/D2: delete explícito (sem FK cascade). O chamador roda na mesma tx do delete do orçamento.
    deleteByBudgetId: async (budgetId: BudgetId) =>
      safe('deleteByBudgetId', async () => {
        await db
          .delete(schema.budgetResults)
          .where(eq(schema.budgetResults.budgetId, budgetId as unknown as string));
      }),
  };
};
