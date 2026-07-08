import { type Result, ok, err } from '../../../../shared/primitives/result.ts';

// Modelo de lançamento da Subcategoria (legado SubCategoryReleaseType). 4 valores; enum COMPARTILHADO
// com a US3 (#317 — cálculo de valores), que fará `switch` exaustivo nos 4 lançamentos. Valores de fio
// idênticos ao legado. Union de literais (precedente: BudgetPlanStatus), não `Brand<string>`: enum
// fechado onde o union É a prova, e só o union dá exaustividade a jusante (`default: const _: never`).
export type LaunchType = 'IPCA' | 'CAED' | 'DESPESAS_PESSOAIS' | 'DESPESAS_LOGISTICAS';
export type LaunchTypeError = 'launch-type-invalid';

const VALUES: readonly LaunchType[] = [
  'IPCA',
  'CAED',
  'DESPESAS_PESSOAIS',
  'DESPESAS_LOGISTICAS',
] as const;

export const values = (): readonly LaunchType[] => VALUES;

// Type predicate: estreita `string` → `LaunchType` (mesmo padrão de `isBudgetPlanStatus`),
// dispensando o cast `as LaunchType` no `parse`.
export const isLaunchType = (raw: string): raw is LaunchType =>
  (VALUES as readonly string[]).includes(raw);

export const parse = (raw: string): Result<LaunchType, LaunchTypeError> =>
  isLaunchType(raw) ? ok(raw) : err('launch-type-invalid');
