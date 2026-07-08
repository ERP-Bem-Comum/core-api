import type { Result } from '../../../../shared/primitives/result.ts';
import * as BudgetPlanId from '../../domain/shared/budget-plan-id.ts';
import * as CostCenterId from '../../domain/cost-structure/cost-center-id.ts';
import { addCostCenter as addCostCenterToTree } from '../../domain/cost-structure/cost-structure.ts';
import type { CostStructure } from '../../domain/cost-structure/types.ts';
import type {
  CostStructureRepository,
  CostStructureMutateError,
} from '../../domain/cost-structure/repository.ts';

export type AddCostCenterCommand = Readonly<{
  budgetPlanId: string;
  name: string;
  direction: string;
}>;

export type AddCostCenterError = BudgetPlanId.BudgetPlanIdError | CostStructureMutateError;

export type AddCostCenterDeps = Readonly<{
  costStructureRepo: CostStructureRepository;
}>;

// Valida o id -> gera o CostCenterId -> delega ao domínio DENTRO da escrita atômica (`mutate`),
// que lê o status e guarda a editabilidade no mesmo commit. Devolve a árvore atualizada.
export const addCostCenter =
  (deps: AddCostCenterDeps) =>
  async (cmd: AddCostCenterCommand): Promise<Result<CostStructure, AddCostCenterError>> => {
    const id = BudgetPlanId.rehydrate(cmd.budgetPlanId);
    if (!id.ok) return id;

    const costCenterId = CostCenterId.generate();
    return deps.costStructureRepo.mutate(id.value, (structure, status) =>
      addCostCenterToTree(
        structure,
        { id: costCenterId, name: cmd.name, direction: cmd.direction },
        status,
      ),
    );
  };
