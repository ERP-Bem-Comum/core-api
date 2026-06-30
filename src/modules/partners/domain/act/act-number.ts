import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// VO `ActNumber` — número do instrumento jurídico do Acordo (D1). Fornecido pelo
// operador, obrigatório e não-branco. A **unicidade** é do port/repo (unique index
// `act_number`), não do VO — espelha `Cnpj`/`SupplierId` (validação aqui, unicidade lá).
// Padrão D: `import * as ActNumber from './act-number.ts'`.

export type ActNumber = Brand<string, 'ActNumber'>;
export type ActNumberError = 'act-number-required';

export const parse = (raw: string): Result<ActNumber, ActNumberError> => {
  const trimmed = raw.trim();
  return trimmed.length === 0 ? err('act-number-required') : ok(trimmed as ActNumber);
};
