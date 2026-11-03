import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { BudgetPlanRepository } from '../../../domain/budget-plan/repository.ts';
import type { CostStructureRepository } from '../../../domain/cost-structure/repository.ts';
import type { BudgetResultRepository } from '../../../domain/budget-result/repository.ts';
import type { PlanCloneWriter } from '../../../application/ports/plan-clone-writer.ts';

// #1092 — grava a cópia nos três stores in-memory, no mesmo tick. Os stores não falham (só o outbox
// do plano pode), e o plano vai primeiro: se ele falha, nada foi escrito. É a mesma aproximação de
// transação do `removeBudget` in-memory; a atomicidade de verdade é cobrada no adapter MySQL.
export const InMemoryPlanCloneWriter = (
  repos: Readonly<{
    planRepo: BudgetPlanRepository;
    costStructureRepo: CostStructureRepository;
    budgetResultRepo: BudgetResultRepository;
  }>,
): PlanCloneWriter => ({
  write: async ({ plan, events, structure, results }) => {
    const savedPlan = await repos.planRepo.save(plan, events);
    if (!savedPlan.ok) return err('plan-clone-write-unavailable');
    const savedStructure = await repos.costStructureRepo.save(structure);
    if (!savedStructure.ok) return err('plan-clone-write-unavailable');
    for (const result of results) {
      const saved = await repos.budgetResultRepo.save(result);
      if (!saved.ok) return err('plan-clone-write-unavailable');
    }
    return ok(undefined);
  },
});
