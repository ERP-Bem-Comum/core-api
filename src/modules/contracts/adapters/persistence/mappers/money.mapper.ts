import type { Result } from '../../../../../shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import type { MoneyError } from '#src/shared/kernel/money.ts';

// MySQL: `bigint` (8-byte). `Money.fromCents` honra `<= MAX_SAFE_INTEGER` no
// smart constructor — valor cabe em `number` no JS sem perda de precisão.

export const moneyToCents = (m: Money.Money): number => m.cents;

export const moneyFromCents = (cents: number): Result<Money.Money, MoneyError> =>
  Money.fromCents(cents);
