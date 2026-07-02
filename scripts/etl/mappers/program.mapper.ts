/**
 * Mapper ETL: linha legada `programs` → agregado `Program`.
 *
 * Validação ESTRITA: reconstrói o agregado via `Program.create(...)` (revalida nome/sigla),
 * NÃO via rehydrate. Acumula os erros de linha via `combine` (D-combine → melhor quarentena):
 * nome < 2 chars → `program-name-required`; sigla fora do formato → `program-sigla-invalid`.
 * `active === 0` → aplica `Program.deactivate` para chegar ao estado Inativo passando pelo domínio.
 *
 * Mapeamento de negócio (decisões já tomadas):
 *   - legacyId = programNumber = row.id (int legado reusado como número de exibição, determinístico).
 *   - id do agregado = ProgramId.generate() (novo UUID).
 *   - director = trim(row.director) || null; generalCharacteristics = trim(row.description) || null.
 *   - logoKey = null SEMPRE (ver comentário abaixo).
 *   - now = createdAt legado se válido; senão o clock injetado. deactivate usa updatedAt (ou now).
 */

import { type Result, ok, err, combine } from '#src/shared/primitives/result.ts';
import * as ProgramId from '#src/modules/programs/domain/shared/program-id.ts';
import * as Sigla from '#src/modules/programs/domain/program/sigla.ts';
import { Program } from '#src/modules/programs/domain/program/program.ts';
import type { Program as ProgramEntity } from '#src/modules/programs/domain/program/types.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { LegacyProgramRow } from '../legacy/rows.ts';
import type { QuarantineReason } from '../quarantine/reason.ts';
import type { MapperResult } from './shared.ts';

const NAME_MIN_LENGTH = 2;

const isValidDate = (d: Date): boolean => !Number.isNaN(d.getTime());

// Trim + colapsa string vazia para null (director/generalCharacteristics são nullable no destino).
const trimToNull = (raw: string | null): string | null => {
  if (raw === null) return null;
  const trimmed = raw.trim();
  return trimmed.length === 0 ? null : trimmed;
};

// Pré-valida o nome com a MESMA regra do domínio (≥ 2 chars após trim); falha → quarentena
// carregando o erro de domínio `program-name-required`.
const validateName = (raw: string): Result<string, QuarantineReason> => {
  const trimmed = raw.trim();
  return trimmed.length >= NAME_MIN_LENGTH
    ? ok(trimmed)
    : err({ tag: 'DomainRejected', field: 'name', code: 'program-name-required' });
};

// Pré-valida a sigla via o smart constructor do domínio; falha → quarentena com o erro dele.
const validateSigla = (raw: string): Result<Sigla.Sigla, QuarantineReason> => {
  const r = Sigla.create(raw);
  return r.ok ? ok(r.value) : err({ tag: 'DomainRejected', field: 'sigla', code: r.error });
};

export const mapLegacyProgramRow = (
  row: LegacyProgramRow,
  clock: Clock,
): MapperResult<ProgramEntity> => {
  // Acumula TODOS os erros de linha (nome + sigla) numa única quarentena (D-combine).
  const fields = combine<readonly [string, Sigla.Sigla], QuarantineReason>([
    validateName(row.name),
    validateSigla(row.abbreviation),
  ]);
  if (!fields.ok) return err(fields.error);

  const now = isValidDate(row.createdAt) ? row.createdAt : clock.now();

  // Reconstrói passando pelo domínio (revalida). Como pré-validamos nome/sigla, `create` não deveria
  // falhar aqui — o ramo de erro é defensivo.
  const created = Program.create({
    id: ProgramId.generate(),
    programNumber: row.id,
    name: row.name,
    sigla: row.abbreviation,
    director: trimToNull(row.director),
    generalCharacteristics: trimToNull(row.description),
    // logoKey = null SEMPRE: o `logo` legado é URL/caminho, não uma chave S3 válida; nulificamos para
    // não corromper o contrato de logoKey. O re-upload do logo original fica para uma fatia futura.
    logoKey: null,
    now,
  });
  if (!created.ok) return err([{ tag: 'DomainRejected', field: 'program', code: created.error }]);

  let program: ProgramEntity = created.value.program;

  if (row.active === 0) {
    // active=0 → Inativo, sempre passando pela transição de domínio (D10). `deactivatedAt` = updatedAt
    // legado (ou `now` se inválido).
    const deactivatedAt = isValidDate(row.updatedAt) ? row.updatedAt : now;
    const deactivated = Program.deactivate(program, deactivatedAt);
    if (!deactivated.ok) {
      return err([{ tag: 'DomainRejected', field: 'status', code: deactivated.error }]);
    }
    program = deactivated.value.program;
  }

  return ok({ aggregate: program, legacyId: row.id });
};
