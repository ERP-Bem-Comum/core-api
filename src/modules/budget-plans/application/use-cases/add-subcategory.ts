import type { Result } from '../../../../shared/primitives/result.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import * as CategoryId from '../../domain/cost-structure/category-id.ts';
import * as SubcategoryId from '../../domain/cost-structure/subcategory-id.ts';
import { addSubcategory as addSubcategoryToTree } from '../../domain/cost-structure/cost-structure.ts';
import type { CostStructure } from '../../domain/cost-structure/types.ts';
import type {
  CostStructureRepository,
  CostStructureMutateError,
} from '../../domain/cost-structure/repository.ts';

export type AddSubcategoryCommand = Readonly<{
  budgetPlanId: string;
  categoryId: string;
  name: string;
  launchType: string;
}>;

export type AddSubcategoryError =
  | BudgetPlanId.BudgetPlanIdError
  | CategoryId.CategoryIdError
  | CostStructureMutateError;

export type AddSubcategoryDeps = Readonly<{
  costStructureRepo: CostStructureRepository;
}>;

// Valida id + categoryId (pai) -> gera o SubcategoryId -> delega ao domínio dentro de `mutate`.
// A folha carrega o launchType (US3); direção/lançamento inválidos vêm do domínio.
export const addSubcategory =
  (deps: AddSubcategoryDeps) =>
  async (cmd: AddSubcategoryCommand): Promise<Result<CostStructure, AddSubcategoryError>> => {
    const id = BudgetPlanId.rehydrate(cmd.budgetPlanId);
    if (!id.ok) return id;

    const categoryId = CategoryId.rehydrate(cmd.categoryId);
    if (!categoryId.ok) return categoryId;

    const subcategoryId = SubcategoryId.generate();
    return deps.costStructureRepo.mutate(id.value, (structure, status) =>
      addSubcategoryToTree(
        structure,
        {
          id: subcategoryId,
          categoryId: categoryId.value,
          name: cmd.name,
          launchType: cmd.launchType,
        },
        status,
      ),
    );
  };
