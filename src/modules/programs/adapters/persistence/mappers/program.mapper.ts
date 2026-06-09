import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as ProgramId from '#src/modules/programs/domain/shared/program-id.ts';
import * as Sigla from '#src/modules/programs/domain/program/sigla.ts';
import type { Program } from '#src/modules/programs/domain/program/types.ts';
import type { ProgramStatus } from '#src/modules/programs/domain/program/status.ts';
import type * as schema from '../schemas/mysql.ts';

export type ProgramMapperError =
  | 'program-mapper-invalid-id'
  | 'program-mapper-invalid-sigla'
  | 'program-mapper-invalid-status';

type ProgramRow = typeof schema.programs.$inferSelect;
type NewProgramRow = typeof schema.programs.$inferInsert;

export const programToInsert = (program: Program): NewProgramRow => ({
  id: program.id as unknown as string,
  programNumber: program.programNumber,
  name: program.name,
  sigla: String(program.sigla),
  director: program.director,
  generalCharacteristics: program.generalCharacteristics,
  logoKey: program.logoKey,
  status: program.status,
  version: program.version,
  createdAt: program.createdAt,
  updatedAt: program.updatedAt,
});

const parseStatus = (raw: string): Result<ProgramStatus, ProgramMapperError> =>
  raw === 'ATIVO' || raw === 'INATIVO' ? ok(raw) : err('program-mapper-invalid-status');

export const programFromRow = (row: Readonly<ProgramRow>): Result<Program, ProgramMapperError> => {
  const id = ProgramId.rehydrate(row.id);
  if (!id.ok) return err('program-mapper-invalid-id');

  const sigla = Sigla.create(row.sigla);
  if (!sigla.ok) return err('program-mapper-invalid-sigla');

  const status = parseStatus(row.status);
  if (!status.ok) return status;

  return ok({
    id: id.value,
    programNumber: row.programNumber,
    name: row.name,
    sigla: sigla.value,
    director: row.director,
    generalCharacteristics: row.generalCharacteristics,
    logoKey: row.logoKey,
    status: status.value,
    version: row.version,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
};
