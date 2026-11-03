import { eq } from 'drizzle-orm';
import process from 'node:process';
import { ok, err } from '#src/shared/primitives/result.ts';
import type { SubcategoryId } from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import type { BudgetId } from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import { isLaunchType } from '#src/modules/budget-plans/domain/cost-structure/launch-type.ts';
import type { SubcategoryLaunchTypeReader } from '#src/modules/budget-plans/application/ports/subcategory-launch-type-reader.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';

// #1092 (F1) — numa consulta só: o launchType da subcategoria, o plano dono da árvore dela
// (subcategoria → categoria → centro de custo) e o plano do orçamento (LEFT JOIN: o orçamento
// inexistente já é recusado antes, pelo BudgetExistsReader). Plano diferente → recusa.
export const createDrizzleSubcategoryLaunchTypeReader = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): SubcategoryLaunchTypeReader => {
  const db = handle.db;

  return {
    launchTypeOf: async (id: SubcategoryId, budgetId: BudgetId) => {
      try {
        const rows = await db
          .select({
            launchType: schema.subcategories.launchType,
            subcategoryPlanId: schema.costCenters.budgetPlanId,
            budgetPlanId: schema.budgets.budgetPlanId,
          })
          .from(schema.subcategories)
          .innerJoin(schema.categories, eq(schema.categories.id, schema.subcategories.categoryId))
          .innerJoin(schema.costCenters, eq(schema.costCenters.id, schema.categories.costCenterId))
          .leftJoin(schema.budgets, eq(schema.budgets.id, budgetId as unknown as string))
          .where(eq(schema.subcategories.id, id as unknown as string))
          .limit(1);

        const row = rows[0];
        if (row === undefined) return err('subcategory-not-found');
        // launch_type fora do enum no banco é corrupção (o CHECK deveria impedir) -> erro de infra.
        if (!isLaunchType(row.launchType)) return err('subcategory-reader-unavailable');
        if (row.budgetPlanId !== null && row.budgetPlanId !== row.subcategoryPlanId) {
          return err('subcategory-not-in-budget-plan');
        }
        return ok(row.launchType);
      } catch (cause) {
        process.stderr.write(`[subcategory-launch-type-reader] ${String(cause)}\n`);
        return err('subcategory-reader-unavailable');
      }
    },
  };
};
