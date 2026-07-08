import { InMemoryBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/budget-plans/adapters/outbox/outbox.in-memory.ts';
import { runBudgetPlanRepositoryContract } from './budget-plan-repository.suite.ts';

runBudgetPlanRepositoryContract('InMemory', {
  make: async () => {
    await Promise.resolve();
    const outbox = InMemoryOutbox();
    return { repo: InMemoryBudgetPlanRepository(outbox.port).repo };
  },
});
