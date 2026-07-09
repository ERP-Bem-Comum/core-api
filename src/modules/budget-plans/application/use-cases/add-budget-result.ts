import { type Result, ok } from '../../../../shared/primitives/result.ts';
import * as BudgetId from '../../domain/shared/budget-id.ts';
import * as SubcategoryId from '../../domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '../../domain/budget-result/budget-result-id.ts';
import * as BudgetResult from '../../domain/budget-result/budget-result.ts';
import type { CalcModelInput } from '../../domain/budget-result/calc-model.ts';
import type {
  BudgetResultRepository,
  BudgetResultRepositoryError,
} from '../../domain/budget-result/repository.ts';
import type {
  SubcategoryLaunchTypeReader,
  SubcategoryLaunchTypeReadError,
} from '../ports/subcategory-launch-type-reader.ts';
import type { BudgetExistsReader, BudgetExistsReadError } from '../ports/budget-exists-reader.ts';

export type AddBudgetResultCommand = Readonly<{
  budgetId: string;
  subcategoryId: string;
  input: CalcModelInput;
}>;

export type AddBudgetResultError =
  | BudgetId.BudgetIdError
  | SubcategoryId.SubcategoryIdError
  | BudgetExistsReadError
  | SubcategoryLaunchTypeReadError
  | BudgetResult.BudgetResultError
  | BudgetResultRepositoryError;

export type AddBudgetResultDeps = Readonly<{
  budgetResultRepo: BudgetResultRepository;
  subcategoryReader: SubcategoryLaunchTypeReader;
  budgetReader: BudgetExistsReader;
}>;

// Orquestra (validar -> fetch launchType -> domínio -> persist). O guard de modelo e o cálculo
// vivem no domínio (BudgetResult.create); aqui só sequenciamos e propagamos o primeiro erro.
export const addBudgetResult =
  (deps: AddBudgetResultDeps) =>
  async (
    cmd: AddBudgetResultCommand,
  ): Promise<Result<BudgetResult.BudgetResult, AddBudgetResultError>> => {
    const budgetId = BudgetId.rehydrate(cmd.budgetId);
    if (!budgetId.ok) return budgetId;

    const subcategoryId = SubcategoryId.rehydrate(cmd.subcategoryId);
    if (!subcategoryId.ok) return subcategoryId;

    const budgetExists = await deps.budgetReader.exists(budgetId.value);
    if (!budgetExists.ok) return budgetExists;

    const launchType = await deps.subcategoryReader.launchTypeOf(subcategoryId.value);
    if (!launchType.ok) return launchType;

    const result = BudgetResult.create({
      id: BudgetResultId.generate(),
      budgetId: budgetId.value,
      subcategoryId: subcategoryId.value,
      input: cmd.input,
      subcategoryLaunchType: launchType.value,
    });
    if (!result.ok) return result;

    const saved = await deps.budgetResultRepo.add(result.value);
    if (!saved.ok) return saved;

    return ok(result.value);
  };
