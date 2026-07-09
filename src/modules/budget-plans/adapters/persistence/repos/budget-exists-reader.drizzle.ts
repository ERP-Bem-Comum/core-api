import { eq } from 'drizzle-orm';
import process from 'node:process';
import { ok, err } from '#src/shared/primitives/result.ts';
import type { BudgetId } from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import type { BudgetExistsReader } from '#src/modules/budget-plans/application/ports/budget-exists-reader.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';

export const createDrizzleBudgetExistsReader = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): BudgetExistsReader => {
  const db = handle.db;

  return {
    exists: async (id: BudgetId) => {
      try {
        const rows = await db
          .select({ id: schema.budgets.id })
          .from(schema.budgets)
          .where(eq(schema.budgets.id, id as unknown as string))
          .limit(1);

        return rows[0] === undefined ? err('budget-not-found') : ok(undefined);
      } catch (cause) {
        process.stderr.write(`[budget-exists-reader] ${String(cause)}\n`);
        return err('budget-reader-unavailable');
      }
    },
  };
};
