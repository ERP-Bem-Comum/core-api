import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import { InMemoryCostStructureRepository } from '#src/modules/budget-plans/adapters/persistence/repos/cost-structure-repository.in-memory.ts';
import { runCostStructureRepositoryContract } from './cost-structure-repository.suite.ts';

runCostStructureRepositoryContract('InMemory', {
  make: async () => {
    await Promise.resolve();
    // O plano semeado existe (RASCUNHO/editável); qualquer outro id -> null (not-found),
    // espelhando o writer atômico `mutate` que lê o status por fora da árvore.
    const budgetPlanId = BudgetPlanId.generate();
    return {
      repo: InMemoryCostStructureRepository((id) =>
        Promise.resolve(String(id) === String(budgetPlanId) ? 'RASCUNHO' : null),
      ).repo,
      budgetPlanId,
    };
  },
});
