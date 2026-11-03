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

    // Desfaz na ordem inversa (R4 da segunda revisão):
    //   1. os lançamentos de cada rede do plano, pelo MESMO repositório em que foram gravados — o
    //      `remove` do plano só os leva quando o repositório de planos foi montado junto com o de
    //      lançamentos, e nem toda composição faz isso (o `_support.ts` dos testes não faz);
    //   2. o plano;
    //   3. a árvore: o store em memória não tem remoção, e a árvore vazia é indistinguível de
    //      "sem árvore" para toda leitura (`findByBudgetPlanId` devolve `empty` nos dois casos, e
    //      os leitores de subcategoria não acham nada nela).
    // Todos os passos rodam, mesmo que um falhe: desfazer o máximo possível é melhor que parar no
    // meio. Os stores em memória não falham; a falha que importa é a da gravação, já devolvida.
    const undo = async (): Promise<void> => {
      for (const budget of plan.budgets) {
        await repos.budgetResultRepo.deleteByBudgetId(budget.id);
      }
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
