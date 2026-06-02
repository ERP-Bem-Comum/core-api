import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import type { MoneyError } from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import type { PeriodError } from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as Classification from '../../domain/contract/classification.ts';
import * as ContractModel from '../../domain/contract/contract-model.ts';
import * as Category from '../../domain/contract/category.ts';
import * as CostCenter from '../../domain/contract/cost-center.ts';

// Parse compartilhado do valor original + período de um contrato (create / create-pending).
// Extraído para eliminar a duplicação entre os use cases de cadastro — a regra de
// negócio (valor ≠ 0, cronologia do período) permanece no domínio (`Contract.create*`).

export type ContractInputParseError =
  | 'create-contract-invalid-period-start'
  | 'create-contract-invalid-period-end'
  | MoneyError
  | PeriodError;

export type ParsedValueAndPeriod = Readonly<{
  originalValue: Money.Money;
  originalPeriod: Period.Period;
}>;

export const parseOriginalValueAndPeriod = (
  input: Readonly<{ originalValueCents: number; periodStart: string; periodEnd: string | null }>,
): Result<ParsedValueAndPeriod, ContractInputParseError> => {
  const periodStart = PlainDate.from(input.periodStart);
  if (!periodStart.ok) return err('create-contract-invalid-period-start');

  const moneyResult = Money.fromCents(input.originalValueCents);
  if (!moneyResult.ok) return moneyResult;

  if (input.periodEnd === null) {
    return ok({
      originalValue: moneyResult.value,
      originalPeriod: Period.createIndefinite(periodStart.value),
    });
  }

  const end = PlainDate.from(input.periodEnd);
  if (!end.ok) return err('create-contract-invalid-period-end');
  const period = Period.create(periodStart.value, end.value);
  if (!period.ok) return period;
  return ok({ originalValue: moneyResult.value, originalPeriod: period.value });
};

// Parse compartilhado dos metadados de cadastro (CTR-CONTRACT-REGISTRATION-METADATA).
// `classification`/`contractModel` obrigatórios; `category`/`costCenter` opcionais
// (null pula o parse); `observations` é texto livre. A regra R1 (teto de OS) vive no
// domínio (`Contract.create*`), não aqui — aqui só traduzimos string → VO.

export type RegistrationMetadataParseError =
  | Classification.ClassificationError
  | ContractModel.ContractModelError
  | Category.CategoryError
  | CostCenter.CostCenterError;

export type ParsedRegistrationMetadata = Readonly<{
  classification: Classification.Classification;
  contractModel: ContractModel.ContractModel;
  category: Category.Category | null;
  costCenter: CostCenter.CostCenter | null;
  observations: string | null;
}>;

export const parseRegistrationMetadata = (
  input: Readonly<{
    classification: string;
    contractModel: string;
    category: string | null;
    costCenter: string | null;
    observations: string | null;
  }>,
): Result<ParsedRegistrationMetadata, RegistrationMetadataParseError> => {
  const classification = Classification.parse(input.classification);
  if (!classification.ok) return classification;
  const contractModel = ContractModel.parse(input.contractModel);
  if (!contractModel.ok) return contractModel;
  const category = input.category === null ? ok(null) : Category.parse(input.category);
  if (!category.ok) return category;
  const costCenter = input.costCenter === null ? ok(null) : CostCenter.parse(input.costCenter);
  if (!costCenter.ok) return costCenter;
  return ok({
    classification: classification.value,
    contractModel: contractModel.value,
    category: category.value,
    costCenter: costCenter.value,
    observations: input.observations,
  });
};
