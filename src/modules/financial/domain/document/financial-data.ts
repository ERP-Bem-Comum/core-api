import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Money from '../../../../shared/kernel/money.ts';
import type { Retention } from '../shared/retention.ts';

// R1: Líquido = Bruto − Descontos na Fonte − Retenções − Descontos + Multa + Juros.
// Impostos registrados NÃO entram — por isso nem aparecem na entrada.
export type ComputeNetValueInput = Readonly<{
  grossValue: Money.Money;
  sourceDiscounts: Money.Money;
  discounts: Money.Money;
  penalty: Money.Money;
  interest: Money.Money;
  retentions: readonly Retention[];
}>;

export type NetValueError =
  | 'net-value-not-positive'
  | 'money-exceeds-safe-integer'
  | 'money-non-integer-value'
  | 'money-negative-value';

// Soma exata em BigInt. Cada parcela é revalidada por Money.fromCents antes: `BigInt` lança
// RangeError com centavos fracionários, NaN ou Infinity, e o domínio devolve Result, não lança.
const exactSum = (
  values: readonly Money.Money[],
): Result<
  bigint,
  'money-exceeds-safe-integer' | 'money-non-integer-value' | 'money-negative-value'
> => {
  let acc = 0n;
  for (const value of values) {
    const valid = Money.fromCents(value.cents);
    if (!valid.ok) return valid;
    acc += BigInt(valid.value.cents);
  }
  return ok(acc);
};

export const computeNetValue = (
  input: ComputeNetValueInput,
): Result<Money.Money, NetValueError> => {
  const additions = exactSum([input.grossValue, input.penalty, input.interest]);
  if (!additions.ok) return additions;
  const deductions = exactSum([
    input.sourceDiscounts,
    ...input.retentions.map((r) => r.value),
    input.discounts,
  ]);
  if (!deductions.ok) return deductions;
  const net = additions.value - deductions.value;
  if (net <= 0n) return err('net-value-not-positive');
  // Um teto só: acima de MAX_SAFE_INTEGER, `Number(net)` também passa do limite e o fromCents recusa.
  return Money.fromCents(Number(net));
};
