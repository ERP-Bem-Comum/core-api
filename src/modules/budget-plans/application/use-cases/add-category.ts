import type { Result } from '../../../../shared/primitives/result.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import * as CostCenterId from '../../domain/cost-structure/cost-center-id.ts';
import * as CategoryId from '../../domain/cost-structure/category-id.ts';
import { addCategory as addCategoryToTree } from '../../domain/cost-structure/cost-structure.ts';
import type { CostStructure } from '../../domain/cost-structure/types.ts';
import type {
  CostStructureRepository,
  CostStructureMutateError,
} from '../../domain/cost-structure/repository.ts';

export type AddCategoryCommand = Readonly<{
  budgetPlanId: string;
  costCenterId: string;
  name: string;
}>;

export type AddCategoryError =
  | BudgetPlanId.BudgetPlanIdError
  | CostCenterId.CostCenterIdError
  | CostStructureMutateError;

export type AddCategoryDeps = Readonly<{
  costStructureRepo: CostStructureRepository;
}>;

// Valida id + costCenterId (pai) -> gera o CategoryId -> delega ao domínio dentro de `mutate`.
// A existência do pai NA ÁRVORE é checada pelo domínio (cost-node-parent-not-found).
export const addCategory =
  (deps: AddCategoryDeps) =>
  async (cmd: AddCategoryCommand): Promise<Result<CostStructure, AddCategoryError>> => {
    const id = BudgetPlanId.rehydrate(cmd.budgetPlanId);
    if (!id.ok) return id;

    const costCenterId = CostCenterId.rehydrate(cmd.costCenterId);
    if (!costCenterId.ok) return costCenterId;

    const categoryId = CategoryId.generate();
    return deps.costStructureRepo.mutate(id.value, (structure, status) =>
      addCategoryToTree(
        structure,
        { id: categoryId, costCenterId: costCenterId.value, name: cmd.name },
        status,
      ),
    );
  };
