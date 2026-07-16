import type { BudgetPlanId } from '../shared/budget-plan-id.ts';
import type { CostCenterId } from './cost-center-id.ts';
import type { CategoryId } from './category-id.ts';
import type { SubcategoryId } from './subcategory-id.ts';
import type { CostDirection } from './cost-direction.ts';
import type { LaunchType } from './launch-type.ts';

// Árvore de custos FIXA em 3 níveis (portado do legado cost-centers). Imutável (Readonly).
//
// `active` (#454 gap 3) é a INTENÇÃO do próprio nó — nunca o estado efetivo. O efetivo (nó ∧
// ancestrais) é derivado na leitura por `withInheritedActive`. Guardar o efetivo aqui destruiria a
// informação de quem foi desativado à mão: reativar o pai não teria como distinguir.
export type Subcategory = Readonly<{
  id: SubcategoryId;
  name: string;
  launchType: LaunchType; // folha carrega o modelo de lançamento (US3)
  active: boolean;
}>;

export type Category = Readonly<{
  id: CategoryId;
  name: string;
  active: boolean;
  subcategories: readonly Subcategory[];
}>;

export type CostCenter = Readonly<{
  id: CostCenterId;
  name: string;
  direction: CostDirection; // raiz carrega o direcionamento (A PAGAR / A RECEBER)
  active: boolean;
  categories: readonly Category[];
}>;

export type CostStructure = Readonly<{
  budgetPlanId: BudgetPlanId;
  costCenters: readonly CostCenter[];
}>;
