import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';

// Competência contábil (#197, R-1a): mês de referência (ano + mês) do documento, distinta de emissão
// (#163) e vencimento. Smart constructor a partir de 'YYYY-MM'; persistida como char(7).

export type Competencia = Readonly<{
  year: number;
  month: number; // 1..12
}>;

export type CompetenciaError = 'invalid-competencia';

const PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;

export const fromString = (raw: string): Result<Competencia, CompetenciaError> => {
  const m = PATTERN.exec(raw);
  if (m?.[1] === undefined || m[2] === undefined) return err('invalid-competencia');
  return ok(immutable({ year: Number(m[1]), month: Number(m[2]) }));
};

export const toString = (c: Competencia): string =>
  `${String(c.year).padStart(4, '0')}-${String(c.month).padStart(2, '0')}`;
