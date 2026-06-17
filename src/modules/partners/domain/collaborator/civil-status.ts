import { type Result, ok, err } from '#src/shared/primitives/result.ts';

// Estado civil (US2). Enum como literal EN snake_case (sem ENUM nativo — ADR-0020).
export type MaritalStatus = 'single' | 'married' | 'divorced' | 'widowed' | 'stable_union';
export type MaritalStatusError = 'marital-status-invalid';

const VALUES: ReadonlySet<string> = new Set<MaritalStatus>([
  'single',
  'married',
  'divorced',
  'widowed',
  'stable_union',
]);

export const parse = (raw: string): Result<MaritalStatus, MaritalStatusError> =>
  VALUES.has(raw) ? ok(raw as MaritalStatus) : err('marital-status-invalid');
