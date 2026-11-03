import { ok, err } from '../../../../../shared/primitives/result.ts';
import { empty } from '../../../domain/cost-structure/cost-structure.ts';
import type { BudgetPlanRepository } from '../../../domain/budget-plan/repository.ts';
import type { CostStructureRepository } from '../../../domain/cost-structure/repository.ts';
import type { BudgetResultRepository } from '../../../domain/budget-result/repository.ts';
import type {
  ClonedPlanContent,
  PlanCloneWriter,
} from '../../../application/ports/plan-clone-writer.ts';

// Mesma chave natural da UNIQUE de bgp_budget_results: (budget, subcategoria, mês).
const resultKey = (r: ClonedPlanContent['results'][number]): string =>
  `${String(r.budgetId)}|${String(r.subcategoryId)}|${String(r.month)}`;

// #1092 — grava a cópia nos três stores in-memory com a mesma semântica do adapter MySQL (F4 da
// revisão):
//   • chave de lançamento repetida é recusada ANTES de gravar, como o INSERT puro + UNIQUE recusa;
//   • se um passo falha no meio, os anteriores são DESFEITOS (compensação), como o ROLLBACK desfaz.
// Sem isso o driver de memória aceitava o que o MySQL recusa e deixava plano parcial — e a suíte
// unitária ficava verde descrevendo outro sistema.
export const InMemoryPlanCloneWriter = (
  repos: Readonly<{
    planRepo: BudgetPlanRepository;
    costStructureRepo: CostStructureRepository;
    budgetResultRepo: BudgetResultRepository;
  }>,
): PlanCloneWriter => ({
  write: async ({ plan, events, structure, results }) => {
    const keys = new Set(results.map(resultKey));
    if (keys.size !== results.length) return err('plan-clone-write-unavailable');

    // Desfaz na ordem inversa: lançamentos e plano (o `remove` leva os lançamentos dos budgets do
    // plano) e a árvore.
    const undo = async (): Promise<void> => {
      await repos.planRepo.remove(plan.id);
      await repos.costStructureRepo.save(empty(plan.id));
    };

    // `create` (INSERT puro + recusa de versão repetida), como o adapter MySQL.
    const savedPlan = await repos.planRepo.create(plan, events);
    if (!savedPlan.ok) {
      return err(
        savedPlan.error === 'budget-plan-already-exists'
          ? 'budget-plan-already-exists'
          : 'plan-clone-write-unavailable',
      );
    }
    const savedStructure = await repos.costStructureRepo.save(structure);
    if (!savedStructure.ok) {
      await undo();
      return err('plan-clone-write-unavailable');
    }
    for (const result of results) {
      const saved = await repos.budgetResultRepo.save(result);
      if (!saved.ok) {
        await undo();
        return err('plan-clone-write-unavailable');
      }
    }
    return ok(undefined);
  },
});
