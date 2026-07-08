import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { BudgetPlanId } from '../../../domain/shared/budget-plan-id.ts';
import type { BudgetPlanStatus } from '../../../domain/budget-plan/status.ts';
import type { CostStructure } from '../../../domain/cost-structure/types.ts';
import { empty } from '../../../domain/cost-structure/cost-structure.ts';
import type {
  CostStructureRepository,
  CostStructureMutation,
} from '../../../domain/cost-structure/repository.ts';

// Lê o status do plano por FORA da árvore de custo (o writer real faz `SELECT status FOR
// UPDATE`). `null` = plano ausente. No driver memory a composition deriva de planRepo.findById.
export type ReadPlanStatus = (id: BudgetPlanId) => Promise<BudgetPlanStatus | null>;

export type InMemoryCostStructureRepositoryHandle = Readonly<{
  repo: CostStructureRepository;
  clear: () => void;
}>;

// `readPlanStatus` default -> plano sempre ausente: mantém verde o round-trip da suíte W1-A
// (que só usa save/find, nunca mutate) sem obrigar todo call-site a injetar o status.
const NO_PLAN: ReadPlanStatus = async () => null;

export const InMemoryCostStructureRepository = (
  readPlanStatus: ReadPlanStatus = NO_PLAN,
): InMemoryCostStructureRepositoryHandle => {
  // Chaveado pelo budgetPlanId (string) — armazenar a estrutura inteira já é replace-all.
  const map = new Map<string, CostStructure>();

  const repo: CostStructureRepository = {
    findByBudgetPlanId: async (id: BudgetPlanId) => ok(map.get(String(id)) ?? empty(id)),

    mutate: async (budgetPlanId: BudgetPlanId, apply: CostStructureMutation) => {
      const status = await readPlanStatus(budgetPlanId);
      if (status === null) return err('budget-plan-not-found');

      const current = map.get(String(budgetPlanId)) ?? empty(budgetPlanId);
      const applied = apply(current, status);
      if (!applied.ok) return applied; // erro de domínio -> não persiste

      map.set(String(budgetPlanId), applied.value);
      return ok(applied.value);
    },

    save: async (structure: CostStructure) => {
      map.set(String(structure.budgetPlanId), structure);
      return ok(undefined);
    },
  };

  return {
    repo,
    clear: () => {
      map.clear();
    },
  };
};
