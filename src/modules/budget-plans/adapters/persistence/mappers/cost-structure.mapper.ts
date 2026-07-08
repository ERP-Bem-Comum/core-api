import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { BudgetPlanId } from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as CostCenterId from '#src/modules/budget-plans/domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '#src/modules/budget-plans/domain/cost-structure/category-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as CostDirection from '#src/modules/budget-plans/domain/cost-structure/cost-direction.ts';
import * as LaunchType from '#src/modules/budget-plans/domain/cost-structure/launch-type.ts';
import type {
  CostStructure,
  CostCenter,
  Category,
  Subcategory,
} from '#src/modules/budget-plans/domain/cost-structure/types.ts';
import type * as schema from '../schemas/mysql.ts';

export type CostStructureMapperError =
  | 'cost-structure-mapper-invalid-cost-center-id'
  | 'cost-structure-mapper-invalid-category-id'
  | 'cost-structure-mapper-invalid-subcategory-id'
  | 'cost-structure-mapper-invalid-direction'
  | 'cost-structure-mapper-invalid-launch-type';

type CostCenterRow = typeof schema.costCenters.$inferSelect;
type NewCostCenterRow = typeof schema.costCenters.$inferInsert;
type CategoryRow = typeof schema.categories.$inferSelect;
type NewCategoryRow = typeof schema.categories.$inferInsert;
type SubcategoryRow = typeof schema.subcategories.$inferSelect;
type NewSubcategoryRow = typeof schema.subcategories.$inferInsert;

// ─── Domínio → rows (para o save) ────────────────────────────────────────────
// Achata a árvore em 3 listas de rows (1 por nível), prontas p/ INSERT.
export type CostStructureRows = Readonly<{
  costCenters: readonly NewCostCenterRow[];
  categories: readonly NewCategoryRow[];
  subcategories: readonly NewSubcategoryRow[];
}>;

export const costStructureToRows = (structure: CostStructure): CostStructureRows => {
  const costCenterRows: NewCostCenterRow[] = [];
  const categoryRows: NewCategoryRow[] = [];
  const subcategoryRows: NewSubcategoryRow[] = [];

  const budgetPlanId = structure.budgetPlanId as unknown as string;
  for (const cc of structure.costCenters) {
    costCenterRows.push({
      id: cc.id as unknown as string,
      budgetPlanId,
      name: cc.name,
      direction: cc.direction,
    });
    for (const cat of cc.categories) {
      categoryRows.push({
        id: cat.id as unknown as string,
        costCenterId: cc.id as unknown as string,
        name: cat.name,
      });
      for (const sub of cat.subcategories) {
        subcategoryRows.push({
          id: sub.id as unknown as string,
          categoryId: cat.id as unknown as string,
          name: sub.name,
          launchType: sub.launchType,
        });
      }
    }
  }

  return { costCenters: costCenterRows, categories: categoryRows, subcategories: subcategoryRows };
};

// ─── Rows → domínio (fail-closed) ────────────────────────────────────────────
// Rejeita direction/launchType inválidos vindos do banco via os `parse` do domínio.
const groupBy = <T>(rows: readonly T[], key: (row: T) => string): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const arr = map.get(k) ?? [];
    arr.push(row);
    map.set(k, arr);
  }
  return map;
};

const subcategoryFromRow = (
  row: Readonly<SubcategoryRow>,
): Result<Subcategory, CostStructureMapperError> => {
  const id = SubcategoryId.rehydrate(row.id);
  if (!id.ok) return err('cost-structure-mapper-invalid-subcategory-id');
  const launchType = LaunchType.parse(row.launchType);
  if (!launchType.ok) return err('cost-structure-mapper-invalid-launch-type');
  return ok({ id: id.value, name: row.name, launchType: launchType.value });
};

const categoryFromRow = (
  row: Readonly<CategoryRow>,
  subcategoriesByCategory: ReadonlyMap<string, readonly Readonly<SubcategoryRow>[]>,
): Result<Category, CostStructureMapperError> => {
  const id = CategoryId.rehydrate(row.id);
  if (!id.ok) return err('cost-structure-mapper-invalid-category-id');

  const subcategories: Subcategory[] = [];
  for (const subRow of subcategoriesByCategory.get(row.id) ?? []) {
    const sub = subcategoryFromRow(subRow);
    if (!sub.ok) return sub;
    subcategories.push(sub.value);
  }
  return ok({ id: id.value, name: row.name, subcategories });
};

const costCenterFromRow = (
  row: Readonly<CostCenterRow>,
  categoriesByCostCenter: ReadonlyMap<string, readonly Readonly<CategoryRow>[]>,
  subcategoriesByCategory: ReadonlyMap<string, readonly Readonly<SubcategoryRow>[]>,
): Result<CostCenter, CostStructureMapperError> => {
  const id = CostCenterId.rehydrate(row.id);
  if (!id.ok) return err('cost-structure-mapper-invalid-cost-center-id');
  const direction = CostDirection.parse(row.direction);
  if (!direction.ok) return err('cost-structure-mapper-invalid-direction');

  const categories: Category[] = [];
  for (const catRow of categoriesByCostCenter.get(row.id) ?? []) {
    const cat = categoryFromRow(catRow, subcategoriesByCategory);
    if (!cat.ok) return cat;
    categories.push(cat.value);
  }
  return ok({ id: id.value, name: row.name, direction: direction.value, categories });
};

export const costStructureFromRows = (
  budgetPlanId: BudgetPlanId,
  rows: Readonly<{
    costCenters: readonly Readonly<CostCenterRow>[];
    categories: readonly Readonly<CategoryRow>[];
    subcategories: readonly Readonly<SubcategoryRow>[];
  }>,
): Result<CostStructure, CostStructureMapperError> => {
  const categoriesByCostCenter = groupBy(rows.categories, (r) => r.costCenterId);
  const subcategoriesByCategory = groupBy(rows.subcategories, (r) => r.categoryId);

  const costCenters: CostCenter[] = [];
  for (const ccRow of rows.costCenters) {
    const cc = costCenterFromRow(ccRow, categoriesByCostCenter, subcategoriesByCategory);
    if (!cc.ok) return cc;
    costCenters.push(cc.value);
  }

  return ok({ budgetPlanId, costCenters });
};
