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

export type NetValueError = 'net-value-not-positive';

export const computeNetValue = (
  input: ComputeNetValueInput,
): Result<Money.Money, NetValueError> => {
  const retentionsTotal = input.retentions.reduce<Money.Money>(
    (acc, r) => Money.add(acc, r.value),
    Money.ZERO,
  );
  const deductions = Money.add(Money.add(input.sourceDiscounts, retentionsTotal), input.discounts);
  const additions = Money.add(input.penalty, input.interest);
  const grossPlus = Money.add(input.grossValue, additions);
  const net = Money.subtract(grossPlus, deductions);
  if (!net.ok) return err('net-value-not-positive');
  if (net.value.cents <= 0) return err('net-value-not-positive');
  return ok(net.value);
};
