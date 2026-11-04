import { ok, err } from '../../../../../shared/primitives/result.ts';
import type { SubcategoryId } from '../../../domain/cost-structure/subcategory-id.ts';
import type { BudgetId } from '../../../domain/shared/budget-id.ts';
import type { LaunchType } from '../../../domain/cost-structure/launch-type.ts';
import type { SubcategoryLaunchTypeReader } from '../../../application/ports/subcategory-launch-type-reader.ts';

// De que plano é cada coisa, lido dos stores. `null` = não está em plano nenhum do store.
export type PlanScope = Readonly<{
  ofSubcategory: (subcategoryId: string) => string | null;
  ofBudget: (budgetId: string) => string | null;
}>;

// Opt-out EXPLÍCITO do escopo: só para testes que exercitam o leitor sem montar planos (seed puro).
// Era o default implícito, e a revisão (R6) apontou o risco: quem esquecesse o argumento montava um
// leitor que aceita o par cruzado que o MySQL recusa.
export const WITHOUT_PLAN_SCOPE: PlanScope = { ofSubcategory: () => null, ofBudget: () => null };

// Sem árvore: só o seed responde. Também explícito, pelo mesmo motivo.
export const WITHOUT_TREE = (): string | null => null;

// launchType de: (a) o seed OU (b) a árvore de custos do store (`fromTree`) — #458. O (b) mantém
// paridade com o drizzle (que lê bgp_subcategories): uma subcategoria criada via HTTP passa a ser
// lançável. O seed (a) segue valendo para testes que não montam árvore. Ausência -> not-found.
//
// #1092 (F1) — paridade com o escopo do drizzle: subcategoria de uma árvore cujo plano é OUTRO que o
// do orçamento é recusada. A subcategoria do seed não pertence a plano nenhum (é atalho de teste do
// driver memory), então fica fora do escopo, como antes.
export const InMemorySubcategoryLaunchTypeReader = (
  seed: Readonly<Record<string, LaunchType>>,
  fromTree: (subcategoryId: string) => string | null,
  scope: PlanScope,
): SubcategoryLaunchTypeReader => ({
  launchTypeOf: async (id: SubcategoryId, budgetId: BudgetId) => {
    // `??`: seed primeiro; ausente cai na árvore (que devolve null quando não acha). Resultado é
    // `LaunchType | null` — o undefined do seed já foi resolvido pelo `??`.
    const launchType = seed[String(id)] ?? (fromTree(String(id)) as LaunchType | null);
    if (launchType === null) return err('subcategory-not-found');
    const subPlan = scope.ofSubcategory(String(id));
    const budgetPlan = scope.ofBudget(String(budgetId));
    if (subPlan !== null && budgetPlan !== null && subPlan !== budgetPlan) {
      return err('subcategory-not-in-budget-plan');
    }
    return ok(launchType);
  },
});
