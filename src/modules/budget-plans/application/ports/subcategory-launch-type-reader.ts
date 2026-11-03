import type { Result } from '../../../../shared/primitives/result.ts';
import type { SubcategoryId } from '../../domain/cost-structure/subcategory-id.ts';
import type { BudgetId } from '../../domain/shared/budget-id.ts';
import type { LaunchType } from '../../domain/cost-structure/launch-type.ts';

// Leitura focada (ISP): o use case de lançamento só precisa do launchType da subcategoria alvo
// para guardar o modelo (CA2). Encapsula o SELECT em bgp_subcategories — não expõe a árvore.
//
// #1092 (F1 da revisão) — a pergunta é ESCOPADA pelo orçamento: a subcategoria tem de pertencer à
// árvore do MESMO plano do orçamento. Não há FK entre bgp_budget_results e a árvore, e sem esse
// escopo a API aceitava (1000 de 1000 tentativas) lançamento com subcategoria de outro plano — o
// órfão que depois travava para sempre a calibração do plano aprovado.
export type SubcategoryLaunchTypeReadError =
  | 'subcategory-not-found'
  | 'subcategory-not-in-budget-plan'
  | 'subcategory-reader-unavailable';

export type SubcategoryLaunchTypeReader = Readonly<{
  launchTypeOf: (
    id: SubcategoryId,
    budgetId: BudgetId,
  ) => Promise<Result<LaunchType, SubcategoryLaunchTypeReadError>>;
}>;
