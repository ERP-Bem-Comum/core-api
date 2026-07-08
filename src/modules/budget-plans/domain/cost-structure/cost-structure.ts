import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { BudgetPlanId } from '../shared/budget-plan-id.ts';
import type { BudgetPlanStatus } from '../budget-plan/status.ts';
import * as CostDirection from './cost-direction.ts';
import * as LaunchType from './launch-type.ts';
import type { CostCenterId } from './cost-center-id.ts';
import type { CategoryId } from './category-id.ts';
import type { SubcategoryId } from './subcategory-id.ts';
import type { CostStructure, CostCenter, Category, Subcategory } from './types.ts';
import type { CostStructureError } from './errors.ts';

// Editabilidade (legado OPTIONS_FOR_UPDATE_BUDGET_PLAN): só RASCUNHO/EM_CALIBRACAO; APROVADO bloqueia.
const EDITABLE_STATUSES: readonly BudgetPlanStatus[] = ['RASCUNHO', 'EM_CALIBRACAO'];
const guardEditable = (status: BudgetPlanStatus): CostStructureError | null =>
  EDITABLE_STATUSES.includes(status) ? null : 'budget-plan-not-editable';

const cleanName = (raw: string): string => raw.trim();

export const empty = (budgetPlanId: BudgetPlanId): CostStructure => ({
  budgetPlanId,
  costCenters: [],
});

export type AddCostCenterInput = Readonly<{ id: CostCenterId; name: string; direction: string }>;

export const addCostCenter = (
  structure: CostStructure,
  input: AddCostCenterInput,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> => {
  const blocked = guardEditable(planStatus);
  if (blocked !== null) return err(blocked);
  const name = cleanName(input.name);
  if (name.length === 0) return err('cost-node-name-required');
  const direction = CostDirection.parse(input.direction);
  if (!direction.ok) return err('cost-node-invalid-direction');

  const costCenter: CostCenter = { id: input.id, name, direction: direction.value, categories: [] };
  return ok({ ...structure, costCenters: [...structure.costCenters, costCenter] });
};

export type AddCategoryInput = Readonly<{
  id: CategoryId;
  costCenterId: CostCenterId;
  name: string;
}>;

export const addCategory = (
  structure: CostStructure,
  input: AddCategoryInput,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> => {
  const blocked = guardEditable(planStatus);
  if (blocked !== null) return err(blocked);
  const name = cleanName(input.name);
  if (name.length === 0) return err('cost-node-name-required');

  if (!structure.costCenters.some((cc) => cc.id === input.costCenterId)) {
    return err('cost-node-parent-not-found');
  }
  const category: Category = { id: input.id, name, subcategories: [] };
  const costCenters = structure.costCenters.map((cc) =>
    cc.id === input.costCenterId ? { ...cc, categories: [...cc.categories, category] } : cc,
  );
  return ok({ ...structure, costCenters });
};

export type AddSubcategoryInput = Readonly<{
  id: SubcategoryId;
  categoryId: CategoryId;
  name: string;
  launchType: string;
}>;

export const addSubcategory = (
  structure: CostStructure,
  input: AddSubcategoryInput,
  planStatus: BudgetPlanStatus,
): Result<CostStructure, CostStructureError> => {
  const blocked = guardEditable(planStatus);
  if (blocked !== null) return err(blocked);
  const name = cleanName(input.name);
  if (name.length === 0) return err('cost-node-name-required');
  const launchType = LaunchType.parse(input.launchType);
  if (!launchType.ok) return err('cost-node-invalid-launch-type');

  const parentExists = structure.costCenters.some((cc) =>
    cc.categories.some((cat) => cat.id === input.categoryId),
  );
  if (!parentExists) return err('cost-node-parent-not-found');

  const subcategory: Subcategory = { id: input.id, name, launchType: launchType.value };
  const costCenters = structure.costCenters.map((cc) => ({
    ...cc,
    categories: cc.categories.map((cat) =>
      cat.id === input.categoryId
        ? { ...cat, subcategories: [...cat.subcategories, subcategory] }
        : cat,
    ),
  }));
  return ok({ ...structure, costCenters });
};
