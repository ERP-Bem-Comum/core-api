import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import * as Money from '../../../../shared/kernel/money.ts';

// Imposto registrado: apenas LIDO/registrado. NUNCA gera filho, NUNCA abate do líquido (R1/R9).
// Inclui os da Reforma Tributária (CBS, IBS Municipal, IBS Estadual) — leitura apenas.

export type RegisteredTaxType =
  | 'ICMS'
  | 'IPI'
  | 'PIS'
  | 'COFINS'
  | 'CBS'
  | 'IBS_Municipal'
  | 'IBS_Estadual';

export type RegisteredTax = Readonly<{
  type: RegisteredTaxType;
  base: Money.Money;
  rateBps: number;
  value: Money.Money;
}>;

export type RegisteredTaxError =
  | 'registered-tax-type-invalid'
  | 'registered-tax-rate-invalid'
  | 'registered-tax-money-invalid';

export type RegisteredTaxInput = Readonly<{
  type: string;
  baseCents: number;
  rateBps: number;
  valueCents: number;
}>;

const TYPES: ReadonlySet<string> = new Set<RegisteredTaxType>([
  'ICMS',
  'IPI',
  'PIS',
  'COFINS',
  'CBS',
  'IBS_Municipal',
  'IBS_Estadual',
]);

export const create = (input: RegisteredTaxInput): Result<RegisteredTax, RegisteredTaxError> => {
  if (!TYPES.has(input.type)) return err('registered-tax-type-invalid');
  if (!Number.isInteger(input.rateBps) || input.rateBps < 0)
    return err('registered-tax-rate-invalid');
  const base = Money.fromCents(input.baseCents);
  if (!base.ok) return err('registered-tax-money-invalid');
  const value = Money.fromCents(input.valueCents);
  if (!value.ok) return err('registered-tax-money-invalid');
  return ok(
    immutable({
      type: input.type as RegisteredTaxType,
      base: base.value,
      rateBps: input.rateBps,
      value: value.value,
    }),
  );
};
