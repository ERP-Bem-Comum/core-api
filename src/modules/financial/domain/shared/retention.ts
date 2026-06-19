import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import * as Money from '../../../../shared/kernel/money.ts';

// Retenção: imposto que GERA título filho e ABATE do líquido (NFS-e e RPA: ISS/IRRF/INSS/CSRF — #154).
// `rateBps` = alíquota em basis points (1100 = 11%) — inteiro, evita float no domínio.

export type RetentionType = 'ISS' | 'IRRF' | 'INSS' | 'CSRF';

export type Retention = Readonly<{
  type: RetentionType;
  base: Money.Money;
  rateBps: number;
  value: Money.Money;
}>;

export type RetentionError =
  | 'retention-type-invalid'
  | 'retention-rate-invalid'
  | 'retention-money-invalid';

export type RetentionInput = Readonly<{
  type: string;
  baseCents: number;
  rateBps: number;
  valueCents: number;
}>;

const TYPES: ReadonlySet<string> = new Set<RetentionType>(['ISS', 'IRRF', 'INSS', 'CSRF']);

export const create = (input: RetentionInput): Result<Retention, RetentionError> => {
  if (!TYPES.has(input.type)) return err('retention-type-invalid');
  if (!Number.isInteger(input.rateBps) || input.rateBps < 0) return err('retention-rate-invalid');
  const base = Money.fromCents(input.baseCents);
  if (!base.ok) return err('retention-money-invalid');
  const value = Money.fromCents(input.valueCents);
  if (!value.ok) return err('retention-money-invalid');
  return ok(
    immutable({
      type: input.type as RetentionType,
      base: base.value,
      rateBps: input.rateBps,
      value: value.value,
    }),
  );
};
