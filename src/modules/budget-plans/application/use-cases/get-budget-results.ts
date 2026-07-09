import { type Result, ok } from '../../../../shared/primitives/result.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import * as BudgetId from '../../domain/shared/budget-id.ts';
import type { BudgetResult } from '../../domain/budget-result/budget-result.ts';
import type {
  BudgetResultRepository,
  BudgetResultRepositoryError,
} from '../../domain/budget-result/repository.ts';

export type GetBudgetResultsError = BudgetId.BudgetIdError | BudgetResultRepositoryError;

export type GetBudgetResultsView = Readonly<{
  items: readonly BudgetResult[];
  total: Money.Money;
}>;

export type GetBudgetResultsDeps = Readonly<{ budgetResultRepo: BudgetResultRepository }>;

// CA3: lançamentos calculados de um orçamento + total (alimenta "Calculando Gastos"). A soma vive
// aqui (Money.add), não na borda — mesmo padrão de BudgetPlan.total; evita `+` cru sobre DTOs.
// Filtros por categoria/subcategoria e ano-anterior ficam para follow-up.
export const getBudgetResults =
  (deps: GetBudgetResultsDeps) =>
  async (budgetIdRaw: string): Promise<Result<GetBudgetResultsView, GetBudgetResultsError>> => {
    const budgetId = BudgetId.rehydrate(budgetIdRaw);
    if (!budgetId.ok) return budgetId;

    const list = await deps.budgetResultRepo.listByBudgetId(budgetId.value);
    if (!list.ok) return list;

    const total = list.value.reduce((acc, r) => Money.add(acc, r.value), Money.ZERO);
    return ok({ items: list.value, total });
  };
