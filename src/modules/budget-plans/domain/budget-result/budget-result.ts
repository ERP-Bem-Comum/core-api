import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type { Money } from '../../../../shared/kernel/money.ts';
import type { LaunchType } from '../cost-structure/launch-type.ts';
import type { BudgetId } from '../shared/budget-id.ts';
import type { ExerciseMonth } from '../shared/exercise-month.ts';
import type { SubcategoryId } from '../cost-structure/subcategory-id.ts';
import type { BudgetResultId } from './budget-result-id.ts';
import {
  type CalcModelInput,
  type CalcError,
  type CalcMismatchError,
  calculate,
  ensureMatchesLaunchType,
} from './calc-model.ts';

// Lançamento calculado de uma subcategoria NUM MÊS do exercício: o valor é derivado (server-side,
// fonte única — FR-003), nunca informado. O modelo do lançamento deve casar com o launchType da
// subcategoria alvo (CA2). O mês (#413) é dimensão da IDENTIDADE de negócio — (budgetId,
// subcategoryId, month) —, não um atributo: o anual é a SOMA dos meses, nunca um valor à parte.
export type BudgetResult = Readonly<{
  id: BudgetResultId;
  budgetId: BudgetId;
  subcategoryId: SubcategoryId;
  month: ExerciseMonth;
  model: LaunchType;
  value: Money;
}>;

export type CreateBudgetResultParams = Readonly<{
  id: BudgetResultId;
  budgetId: BudgetId;
  subcategoryId: SubcategoryId;
  month: ExerciseMonth;
  input: CalcModelInput;
  subcategoryLaunchType: LaunchType;
}>;

export type BudgetResultError = CalcMismatchError | CalcError;

// Smart constructor: guarda o modelo contra o launchType da subcategoria, então calcula. Um modelo
// divergente falha ANTES do cálculo (calc-model-mismatch) — não há resultado sem consistência.
export const create = (
  params: CreateBudgetResultParams,
): Result<BudgetResult, BudgetResultError> => {
  const matched = ensureMatchesLaunchType(params.input, params.subcategoryLaunchType);
  if (!matched.ok) return matched;

  const value = calculate(params.input);
  if (!value.ok) return value;

  return ok({
    id: params.id,
    budgetId: params.budgetId,
    subcategoryId: params.subcategoryId,
    month: params.month,
    model: params.input.kind,
    value: value.value,
  });
};

export type CloneBudgetResultParams = Readonly<{
  id: BudgetResultId;
  budgetId: BudgetId;
  subcategoryId: SubcategoryId;
}>;

// US4 — clona um lançamento para outro orçamento/subcategoria (derivação de plano filho). Copia
// month + model + value SEM recalcular: o valor do pai é preservado (não re-derivado da fórmula).
// O mês vem da origem: clonar move o lançamento de orçamento, nunca de mês.
export const clone = (source: BudgetResult, params: CloneBudgetResultParams): BudgetResult => ({
  id: params.id,
  budgetId: params.budgetId,
  subcategoryId: params.subcategoryId,
  month: source.month,
  model: source.model,
  value: source.value,
});
