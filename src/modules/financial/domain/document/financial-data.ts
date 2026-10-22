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

export type NetValueError = 'net-value-not-positive' | 'money-exceeds-safe-integer';

const exactSum = (values: readonly Money.Money[]): bigint =>
  values.reduce((acc, value) => acc + BigInt(value.cents), 0n);

export const computeNetValue = (
  input: ComputeNetValueInput,
): Result<Money.Money, NetValueError> => {
  const additions = exactSum([input.grossValue, input.penalty, input.interest]);
  const deductions = exactSum([
    input.sourceDiscounts,
    ...input.retentions.map((r) => r.value),
    input.discounts,
  ]);
  const net = additions - deductions;
  if (net <= 0n) return err('net-value-not-positive');
  if (net > BigInt(Number.MAX_SAFE_INTEGER)) return err('money-exceeds-safe-integer');
  const money = Money.fromCents(Number(net));
  if (!money.ok) return err('money-exceeds-safe-integer');
  return ok(money.value);
};
