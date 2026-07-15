import { type Result, ok } from '../../../../shared/primitives/result.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import * as BudgetId from '../../domain/shared/budget-id.ts';
import * as ExerciseMonth from '../../domain/shared/exercise-month.ts';
import type { BudgetResult } from '../../domain/budget-result/budget-result.ts';
import type {
  BudgetResultRepository,
  BudgetResultRepositoryError,
} from '../../domain/budget-result/repository.ts';

export type GetBudgetResultsError =
  | BudgetId.BudgetIdError
  | ExerciseMonth.ExerciseMonthError
  | BudgetResultRepositoryError;

export type GetBudgetResultsView = Readonly<{
  items: readonly BudgetResult[];
  total: Money.Money;
}>;

export type GetBudgetResultsDeps = Readonly<{ budgetResultRepo: BudgetResultRepository }>;

// CA3: lançamentos calculados de um orçamento + total (alimenta "Calculando Gastos"). A soma vive
// aqui (Money.add), não na borda — mesmo padrão de BudgetPlan.total; evita `+` cru sobre DTOs.
// Filtros por categoria/subcategoria e ano-anterior ficam para follow-up.
//
// #413 — `month` é OPCIONAL: ausente devolve o ano inteiro (o grid carrega os 12 meses numa ida; o
// passador é client-side). O filtro é aplicado em memória, não no repositório: a leitura já traz o
// ano do orçamento (~1.9k itens no pior caso — research §D4) e o `?month=` é conveniência de API,
// não caminho de performance. Ampliar o port com `listByBudgetIdAndMonth` custaria mais do que
// entrega. O total SEMPRE acompanha o recorte devolvido — senão a resposta mentiria.
export const getBudgetResults =
  (deps: GetBudgetResultsDeps) =>
  async (
    budgetIdRaw: string,
    monthRaw?: number,
  ): Promise<Result<GetBudgetResultsView, GetBudgetResultsError>> => {
    const budgetId = BudgetId.rehydrate(budgetIdRaw);
    if (!budgetId.ok) return budgetId;

    let month: ExerciseMonth.ExerciseMonth | undefined = undefined;
    if (monthRaw !== undefined) {
      const parsed = ExerciseMonth.parse(monthRaw);
      if (!parsed.ok) return parsed;
      month = parsed.value;
    }

    const list = await deps.budgetResultRepo.listByBudgetId(budgetId.value);
    if (!list.ok) return list;

    const items = month === undefined ? list.value : list.value.filter((r) => r.month === month);

    const total = items.reduce((acc, r) => Money.add(acc, r.value), Money.ZERO);
    return ok({ items, total });
  };
