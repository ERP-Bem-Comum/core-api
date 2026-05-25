import { type Result, ok, err } from '../primitives/result.ts';
import { immutable } from '../primitives/immutable.ts';
import type { Brand } from '../primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as Money from '#src/shared/kernel/money.ts'`.
//
// Shared Kernel (§3.H.4 DO H§36): VO genuinamente cross-BC.
// Money é universal — Contratos, Faturamento, Orçamento, etc.

export type Money = Brand<{ readonly cents: number }, 'Money'>;

export type MoneyError =
  | 'money-negative-value'
  | 'money-non-integer-value'
  | 'money-exceeds-safe-integer'
  | 'money-negative-result';

// DO B§10 — identidade fixa via `immutable()`. Substitui o antigo `zero()` (DON'T B§10).
export const ZERO: Money = immutable({ cents: 0 }) as Money;

// DO B§9 — smart constructor retorna Result.
export const fromCents = (cents: number): Result<Money, MoneyError> => {
  if (!Number.isInteger(cents)) return err('money-non-integer-value');
  if (cents < 0) return err('money-negative-value');
  // Defeito #8: valores acima de Number.MAX_SAFE_INTEGER perdem precisão IEEE 754.
  // Ex.: 9_007_199_254_740_993 === 9_007_199_254_740_992. Bug fiscal silencioso.
  if (cents > Number.MAX_SAFE_INTEGER) return err('money-exceeds-safe-integer');
  return ok(immutable({ cents }) as Money);
};

export const add = (a: Money, b: Money): Money => immutable({ cents: a.cents + b.cents }) as Money;

export const subtract = (a: Money, b: Money): Result<Money, 'money-negative-result'> => {
  const diff = a.cents - b.cents;
  if (diff < 0) return err('money-negative-result');
  return ok(immutable({ cents: diff }) as Money);
};

export const equals = (a: Money, b: Money): boolean => a.cents === b.cents;

export const greaterThan = (a: Money, b: Money): boolean => a.cents > b.cents;
