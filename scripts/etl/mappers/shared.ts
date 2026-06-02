/**
 * Helpers compartilhados dos mappers do ETL.
 *
 * Cada helper traduz a validação de borda (VO/required/overflow) num
 * `Result<_, QuarantineReason>` — `E` homogêneo para alimentar `combine` e
 * acumular TODOS os erros de uma linha de uma vez (D-combine).
 */

import { type Result, ok, err, mapErr } from '#src/shared/primitives/result.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import type { QuarantineReason } from '../quarantine/reason.ts';

export type MappedEntity<A> = Readonly<{ aggregate: A; legacyId: number }>;
export type MapperResult<A> = Result<MappedEntity<A>, readonly QuarantineReason[]>;

/** String obrigatória: trim + rejeita vazio como `RequiredFieldMissing`. */
export const requireField = (value: string, field: string): Result<string, QuarantineReason> => {
  const trimmed = value.trim();
  return trimmed.length === 0 ? err({ tag: 'RequiredFieldMissing', field }) : ok(trimmed);
};

/** CNPJ → VO `Cnpj`; falha vira `CnpjInvalid` (carrega o valor p/ o detalhe fora do git). */
export const parseCnpjField = (raw: string, field: string): Result<Cnpj.Cnpj, QuarantineReason> =>
  mapErr(Cnpj.parse(raw), (): QuarantineReason => ({ tag: 'CnpjInvalid', field, attempted: raw }));

/** CPF → VO `Cpf`; falha vira `CpfInvalid`. */
export const parseCpfField = (raw: string, field: string): Result<Cpf.Cpf, QuarantineReason> =>
  mapErr(Cpf.parse(raw), (): QuarantineReason => ({ tag: 'CpfInvalid', field, attempted: raw }));

// Espelha o EMAIL_RE do domínio (supplier.ts) — o domínio valida e-mail por regex, não VO.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mail (string validada por formato); falha vira `EmailInvalid`. */
export const requireEmail = (raw: string, field: string): Result<string, QuarantineReason> => {
  const trimmed = raw.trim();
  return EMAIL_RE.test(trimmed) ? ok(trimmed) : err({ tag: 'EmailInvalid', field, attempted: raw });
};

/** D13 — comprimento máximo do alvo; estouro vira `Overflow` (nunca trunca). */
export const checkOverflow = (
  value: string,
  field: string,
  maxLength: number,
): Result<string, QuarantineReason> =>
  value.length > maxLength
    ? err({ tag: 'Overflow', field, attempted: value, maxLength })
    : ok(value);

/** D8/D10 — `active` (tinyint legado) → estado do agregado. */
export const statusFromActive = (active: number): 'Active' | 'Inactive' =>
  active === 1 ? 'Active' : 'Inactive';

/** Enum literal (ADR-0031 §D2): parse do domínio; fora do Set vira `EnumUnknown`. */
export const parseEnumField = <T>(
  parse: (raw: string) => Result<T, unknown>,
  raw: string,
  field: string,
): Result<T, QuarantineReason> =>
  mapErr(parse(raw), (): QuarantineReason => ({ tag: 'EnumUnknown', field, attempted: raw }));

/** Enum nullable: `null` passa direto; presente-mas-inválido vira `EnumUnknown`. */
export const parseNullableEnumField = <T>(
  parse: (raw: string) => Result<T, unknown>,
  raw: string | null,
  field: string,
): Result<T | null, QuarantineReason> =>
  raw === null ? ok(null) : parseEnumField(parse, raw, field);

/** D13 nullable: `null` passa direto; estouro vira `Overflow`. */
export const checkOverflowNullable = (
  value: string | null,
  field: string,
  maxLength: number,
): Result<string | null, QuarantineReason> =>
  value === null ? ok(null) : checkOverflow(value, field, maxLength);
