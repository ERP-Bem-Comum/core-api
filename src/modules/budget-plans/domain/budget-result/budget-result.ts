import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type { Money } from '../../../../shared/kernel/money.ts';
import type { LaunchType } from '../cost-structure/launch-type.ts';
import type { BudgetId } from '../shared/budget-id.ts';
import type { SubcategoryId } from '../cost-structure/subcategory-id.ts';
import type { BudgetResultId } from './budget-result-id.ts';
import {
  type CalcModelInput,
  type CalcError,
  type CalcMismatchError,
  calculate,
  ensureMatchesLaunchType,
} from './calc-model.ts';

// Lançamento calculado de uma subcategoria: o valor é derivado (server-side, fonte única — FR-003),
// nunca informado. O modelo do lançamento deve casar com o launchType da subcategoria alvo (CA2).
export type BudgetResult = Readonly<{
  id: BudgetResultId;
  budgetId: BudgetId;
  subcategoryId: SubcategoryId;
  model: LaunchType;
  value: Money;
}>;

export type CreateBudgetResultParams = Readonly<{
  id: BudgetResultId;
  budgetId: BudgetId;
  subcategoryId: SubcategoryId;
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
    model: params.input.kind,
    value: value.value,
  });
};
