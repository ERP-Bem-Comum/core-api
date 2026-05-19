import { type Result, ok, err } from '../../../../shared/result.ts';
import type { Brand } from '../../../../shared/brand.ts';

export type Money = Brand<{ readonly cents: number }, 'Money'>;

export type MoneyError =
  | 'money-negative-value'
  | 'money-non-integer-value'
  | 'money-exceeds-safe-integer';

export const Money = {
  fromCents: (cents: number): Result<Money, MoneyError> => {
    if (!Number.isInteger(cents)) return err('money-non-integer-value');
    if (cents < 0) return err('money-negative-value');
    // Defeito #8: valores acima de Number.MAX_SAFE_INTEGER perdem precisão IEEE 754.
    // Ex.: 9_007_199_254_740_993 === 9_007_199_254_740_992. Bug fiscal silencioso.
    if (cents > Number.MAX_SAFE_INTEGER) return err('money-exceeds-safe-integer');
    return ok({ cents } as Money);
  },

  zero: (): Money => ({ cents: 0 }) as Money,

  add: (a: Money, b: Money): Money => ({ cents: a.cents + b.cents }) as Money,

  subtract: (a: Money, b: Money): Result<Money, 'money-negative-result'> => {
    const diff = a.cents - b.cents;
    if (diff < 0) return err('money-negative-result');
    return ok({ cents: diff } as Money);
  },

  equals: (a: Money, b: Money): boolean => a.cents === b.cents,

  greaterThan: (a: Money, b: Money): boolean => a.cents > b.cents,
};
