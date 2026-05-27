import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import type { MoneyError } from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import type { PeriodError } from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';

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
