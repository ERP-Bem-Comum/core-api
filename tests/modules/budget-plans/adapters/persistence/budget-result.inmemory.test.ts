import { InMemoryBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.in-memory.ts';
import { runBudgetResultRepositoryContract } from './budget-result-repository.suite.ts';

runBudgetResultRepositoryContract('InMemory', {
  make: async () => {
    await Promise.resolve();
    return { repo: InMemoryBudgetResultRepository().repo };
  },
});
