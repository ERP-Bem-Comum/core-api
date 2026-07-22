import { eq } from 'drizzle-orm';
import process from 'node:process';
import { ok, err } from '#src/shared/primitives/result.ts';
import type { SubcategoryId } from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import { isLaunchType } from '#src/modules/budget-plans/domain/cost-structure/launch-type.ts';
import type { SubcategoryLaunchTypeReader } from '#src/modules/budget-plans/application/ports/subcategory-launch-type-reader.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';

export const createDrizzleSubcategoryLaunchTypeReader = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): SubcategoryLaunchTypeReader => {
  const db = handle.db;

  return {
    launchTypeOf: async (id: SubcategoryId) => {
      try {
        const rows = await db
          .select({ launchType: schema.subcategories.launchType })
          .from(schema.subcategories)
          .where(eq(schema.subcategories.id, id as unknown as string))
          .limit(1);

        const raw = rows[0]?.launchType;
        if (raw === undefined) return err('subcategory-not-found');
        // launch_type fora do enum no banco é corrupção (o CHECK deveria impedir) -> erro de infra.
        if (!isLaunchType(raw)) return err('subcategory-reader-unavailable');
        return ok(raw);
      } catch (cause) {
        process.stderr.write(`[subcategory-launch-type-reader] ${String(cause)}\n`);
        return err('subcategory-reader-unavailable');
      }
    },
  };
};
