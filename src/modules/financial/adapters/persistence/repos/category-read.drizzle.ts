import { asc, eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as Category from '#src/modules/financial/domain/category/category.ts';
import * as CategoryId from '#src/modules/financial/domain/category/category-id.ts';
import type {
  CategoryReadError,
  CategoryReadPort,
} from '#src/modules/financial/application/ports/category-read.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finCategories } from '../schemas/mysql.ts';

const logStore = (op: string, cause: unknown): void => {
  process.stderr.write(`[fin-category-read] ${op} failed: ${String(cause)}\n`);
};

// SELECT lean `active=true` ordenado por (group, name). Mapper row→domínio via smart constructor:
// o `group` (varchar+CHECK) revalida no domínio (adapters.md — domínio rejeita estado inválido).
export const createDrizzleCategoryReadStore = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): CategoryReadPort => {
  const { db } = handle;

  return {
    list: async (): Promise<Result<readonly Category.Category[], CategoryReadError>> => {
      try {
        const rows = await db
          .select({
            id: finCategories.id,
            name: finCategories.name,
            group: finCategories.group,
            active: finCategories.active,
            parentId: finCategories.parentId,
          })
          .from(finCategories)
          .where(eq(finCategories.active, true))
          .orderBy(asc(finCategories.group), asc(finCategories.name));

        const out: Category.Category[] = [];
        for (const row of rows) {
          const idR = CategoryId.rehydrate(row.id);
          if (!idR.ok) return err('category-read-unavailable');
          let parentId: CategoryId.CategoryId | null = null;
          if (row.parentId !== null) {
            const pR = CategoryId.rehydrate(row.parentId);
            if (!pR.ok) return err('category-read-unavailable');
            parentId = pR.value;
          }
          const catR = Category.create({
            id: idR.value,
            name: row.name,
            group: row.group,
            active: row.active,
            parentId,
          });
          if (!catR.ok) return err('category-read-unavailable');
          out.push(catR.value);
        }
        return ok(out);
      } catch (cause) {
        logStore('list', cause);
        return err('category-read-unavailable');
      }
    },
  };
};
