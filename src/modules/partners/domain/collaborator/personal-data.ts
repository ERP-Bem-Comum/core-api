/**
 * Dado pessoal do colaborador (#1072) — o ponto ÚNICO do agregado que normaliza e aplica o
 * "preenche uma vez" a todo comando que escreve dado pessoal (`edit`, `completeRegistration`).
 *
 * A invariante é do agregado, não do comando: quando ela vivia só no `edit`, o
 * `completeRegistration` (segundo comando que escreve os mesmos campos) apagava ou trocava
 * RG, nascimento e raça sem 409 e sem histórico.
 *
 * Normalização (vale para o valor recebido E para o gravado):
 *   - texto: `trim`; branco vira `null`; `''` nunca é gravado e, quando já existe (ETL do legado),
 *     conta como vazio;
 *   - limite de tamanho com erro nomeado (422) — sem ele o MySQL recusa (1406) e o repositório
 *     traduz para `collaborator-repo-unavailable`, um 503 falso;
 *   - nascimento é DIA CIVIL: meia-noite UTC do dia, sem data futura, dentro da faixa do DATETIME.
 *
 * O Zod da borda repete os limites de propósito (ADR-0027): a borda dá o 400 cedo, o domínio
 * garante a invariante para os chamadores que não passam pela borda.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as Race from './race.ts';
import type { CollaboratorError } from './errors.ts';
import type { Collaborator } from './types.ts';

/** Espelha `varchar('rg', { length: 20 })` de `par_collaborators`. */
export const RG_MAX_LENGTH = 20;

/** Contrato de borda do #1054 (a coluna é varchar(255); o produto fixou 120). */
export const GENDER_IDENTITY_DESCRIPTION_MAX_LENGTH = 120;

// Piso do DATETIME do MySQL (`1000-01-01`). Abaixo dele o banco recusa (1292) e a recusa vira 503.
// É piso TÉCNICO, não regra de produto: um piso plausível de nascimento (ex.: 1900) é decisão aberta.
const MIN_BIRTH_YEAR = 1000;

/** `trim`; `null`/ausente/branco → `null`. */
export const blankToNull = (raw: string | null | undefined): string | null => {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const boundedText = <E extends CollaboratorError>(
  raw: string | null | undefined,
  max: number,
  tooLong: E,
): Result<string | null, E> => {
  const value = blankToNull(raw);
  if (value !== null && value.length > max) return err(tooLong);
  return ok(value);
};

export const parseRg = (
  raw: string | null | undefined,
): Result<string | null, 'collaborator-rg-too-long'> =>
  boundedText(raw, RG_MAX_LENGTH, 'collaborator-rg-too-long');

export const parseGenderIdentityDescription = (
  raw: string | null | undefined,
): Result<string | null, 'collaborator-gender-identity-description-too-long'> =>
  boundedText(
    raw,
    GENDER_IDENTITY_DESCRIPTION_MAX_LENGTH,
    'collaborator-gender-identity-description-too-long',
  );

const isValidDate = (d: Date): boolean => !Number.isNaN(d.getTime());

/**
 * Meia-noite UTC do dia civil (UTC) do instante. Pressupõe `Date` válida. `setUTCFullYear`, não
 * `Date.UTC`: este mapeia os anos 0–99 para 1900–1999.
 */
const toCivilDay = (d: Date): Date => {
  const midnight = new Date(0);
  midnight.setUTCFullYear(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return midnight;
};

/**
 * Dia civil `YYYY-MM-DD` do instante — helper ÚNICO da comparação no "preenche uma vez" e da
 * serialização do histórico (antes eram dois cálculos, um em cada arquivo). Pressupõe `Date` válida.
 */
export const civilDayIso = (d: Date): string => toCivilDay(d).toISOString().slice(0, 10);

/**
 * Nascimento como dia civil: `null`/ausente → `null`; `Date` inválida ou abaixo do piso do DATETIME →
 * `collaborator-date-of-birth-invalid`; dia posterior ao dia de `today` → `...-in-future`.
 */
export const parseDateOfBirth = (
  raw: Date | null | undefined,
  today: Date,
): Result<
  Date | null,
  'collaborator-date-of-birth-invalid' | 'collaborator-date-of-birth-in-future'
> => {
  if (raw === undefined || raw === null) return ok(null);
  if (!isValidDate(raw) || raw.getUTCFullYear() < MIN_BIRTH_YEAR) {
    return err('collaborator-date-of-birth-invalid');
  }
  const day = toCivilDay(raw);
  if (isValidDate(today) && day.getTime() > toCivilDay(today).getTime()) {
    return err('collaborator-date-of-birth-in-future');
  }
  return ok(day);
};

// "Preenche uma vez" (decisão da P.O., 19/10/2026) — dado gravado não muda, o que FALTA pode ser
// preenchido. `current` e `next` chegam JÁ normalizados (branco = `null`):
//   - `next` vazio      → MANTÉM o gravado.
//   - nada gravado      → GRAVA o recebido.
//   - igual ao gravado  → mantém (o PUT é total e reenvia o que leu).
//   - diferente         → RECUSA.
const fillOnce = <V>(
  current: V | null,
  next: V | null,
  same: (a: V, b: V) => boolean,
): Result<V | null, 'collaborator-personal-data-immutable'> => {
  if (next === null) return ok(current);
  if (current === null) return ok(next);
  return same(current, next) ? ok(current) : err('collaborator-personal-data-immutable');
};

export type ImmutablePersonalDataInput = Readonly<{
  rg?: string | null | undefined;
  dateOfBirth?: Date | null | undefined;
  race?: string | null | undefined;
}>;

export type ImmutablePersonalData = Readonly<{
  rg: string | null;
  dateOfBirth: Date | null;
  race: Race.Race | null;
}>;

/**
 * Resolve RG, nascimento e raça para gravação: normaliza o recebido e o gravado e aplica o
 * "preenche uma vez". Único caminho de escrita desses três campos — todo comando passa por aqui.
 */
export const resolveImmutablePersonalData = (
  collaborator: Collaborator,
  input: ImmutablePersonalDataInput,
  at: Date,
): Result<ImmutablePersonalData, CollaboratorError> => {
  const nextRg = parseRg(input.rg);
  if (!nextRg.ok) return nextRg;
  const rg = fillOnce(blankToNull(collaborator.rg), nextRg.value, (a, b) => a === b);
  if (!rg.ok) return rg;

  const nextDateOfBirth = parseDateOfBirth(input.dateOfBirth, at);
  if (!nextDateOfBirth.ok) return nextDateOfBirth;
  const currentDateOfBirth =
    collaborator.dateOfBirth !== null && isValidDate(collaborator.dateOfBirth)
      ? collaborator.dateOfBirth
      : null;
  const dateOfBirth = fillOnce(
    currentDateOfBirth,
    nextDateOfBirth.value,
    (a, b) => civilDayIso(a) === civilDayIso(b),
  );
  if (!dateOfBirth.ok) return dateOfBirth;

  const raceRaw = blankToNull(input.race);
  const nextRace = raceRaw === null ? ok(null) : Race.parse(raceRaw);
  if (!nextRace.ok) return nextRace;
  const race = fillOnce(collaborator.race, nextRace.value, (a, b) => a === b);
  if (!race.ok) return race;

  return ok({ rg: rg.value, dateOfBirth: dateOfBirth.value, race: race.value });
};
