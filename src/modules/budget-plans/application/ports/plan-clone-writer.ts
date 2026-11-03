import type { Result } from '../../../../shared/primitives/result.ts';
import type { BudgetPlan } from '../../domain/budget-plan/types.ts';
import type { CostStructure } from '../../domain/cost-structure/types.ts';
import type { BudgetResult } from '../../domain/budget-result/budget-result.ts';
import type { BudgetPlansModuleEvent } from '../../public-api/events.ts';

export type PlanCloneWriteError = 'plan-clone-write-unavailable';

// O plano copiado inteiro, já montado em memória: cabeçalho com os orçamentos, árvore de custos e
// lançamentos, todos com ids novos e apontando uns para os outros.
export type ClonedPlanContent = Readonly<{
  plan: BudgetPlan;
  events: readonly BudgetPlansModuleEvent[];
  structure: CostStructure;
  results: readonly BudgetResult[];
}>;

// #1092 — grava a cópia de um plano TUDO OU NADA. Existe porque a cópia atravessa três
// repositórios (plano, árvore, lançamentos) e cada um abre a própria transação: gravados um a um,
// uma falha no meio deixava um plano com rede e árvore e R$ 0. Uma porta só, uma transação só no
// adapter MySQL. Serve aos três usos da cópia: importação, calibração e cenário.
export type PlanCloneWriter = Readonly<{
  write: (content: ClonedPlanContent) => Promise<Result<void, PlanCloneWriteError>>;
}>;
