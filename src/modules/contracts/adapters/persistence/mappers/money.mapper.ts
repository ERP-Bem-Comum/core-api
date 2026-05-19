import type { Result } from '../../../../../shared/result.ts';
import { Money, type MoneyError } from '../../../domain/shared/money.ts';

// MySQL: `bigint` (8-byte). `Money.fromCents` honra `<= MAX_SAFE_INTEGER` no
// smart constructor — valor cabe em `number` no JS sem perda de precisão.

export const moneyToCents = (m: Money): number => m.cents;

export const moneyFromCents = (cents: number): Result<Money, MoneyError> => Money.fromCents(cents);
