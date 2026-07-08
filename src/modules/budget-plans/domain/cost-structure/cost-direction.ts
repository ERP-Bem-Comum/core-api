import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

// Direcionamento do Centro de Custo. Valores de fio idênticos ao legado (CostCenterType): com espaço.
// Enum FECHADO modelado como union de literais (precedente: BudgetPlanStatus em budget-plan/status.ts),
// não `Brand<string>`. Motivos: (1) todo valor do tipo já é válido, então o brand só adicionaria
// fricção (obrigar `parse` para um literal comprovadamente válido) sem prova extra; (2) o union dá
// exaustividade a jusante — a US3 (#317) pode fazer `switch` com `default: const _: never = x`, coisa
// que `Brand<string>` (carrier = `string`) jamais permitiria.
export type CostDirection = 'A PAGAR' | 'A RECEBER';
export type CostDirectionError = 'cost-direction-invalid';

const VALUES: readonly CostDirection[] = ['A PAGAR', 'A RECEBER'] as const;

export const values = (): readonly CostDirection[] => VALUES;

// Type predicate: estreita `string` → `CostDirection` (mesmo padrão de `isBudgetPlanStatus`),
// dispensando o cast `as CostDirection` no `parse`.
export const isCostDirection = (raw: string): raw is CostDirection =>
  (VALUES as readonly string[]).includes(raw);

export const parse = (raw: string): Result<CostDirection, CostDirectionError> =>
  isCostDirection(raw) ? ok(raw) : err('cost-direction-invalid');
