import type { BudgetPlanId } from '../shared/budget-plan-id.ts';
import type { CostCenterId } from './cost-center-id.ts';
import type { CategoryId } from './category-id.ts';
import type { SubcategoryId } from './subcategory-id.ts';
import type { CostDirection } from './cost-direction.ts';
import type { LaunchType } from './launch-type.ts';

// Árvore de custos FIXA em 3 níveis (portado do legado cost-centers). Imutável (Readonly).
export type Subcategory = Readonly<{
  id: SubcategoryId;
  name: string;
  launchType: LaunchType; // folha carrega o modelo de lançamento (US3)
}>;

export type Category = Readonly<{
  id: CategoryId;
  name: string;
  subcategories: readonly Subcategory[];
}>;

export type CostCenter = Readonly<{
  id: CostCenterId;
  name: string;
  direction: CostDirection; // raiz carrega o direcionamento (A PAGAR / A RECEBER)
  categories: readonly Category[];
}>;

export type CostStructure = Readonly<{
  budgetPlanId: BudgetPlanId;
  costCenters: readonly CostCenter[];
}>;
