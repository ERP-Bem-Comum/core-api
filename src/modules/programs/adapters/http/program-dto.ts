/**
 * Mapeadores Program (domínio) -> DTO HTTP. A casca da borda serializa os branded types
 * (`ProgramId`, `Sigla`) como string e as datas como ISO-8601.
 */

import type { Program } from '#src/modules/programs/domain/program/types.ts';
import type { ProgramItemDto, ProgramDetailDto } from './schemas.ts';

/** Item enxuto da listagem. */
export const programToItemDto = (program: Program): ProgramItemDto => ({
  id: String(program.id),
  programNumber: program.programNumber,
  name: program.name,
  sigla: String(program.sigla),
  generalCharacteristics: program.generalCharacteristics,
  logoKey: program.logoKey,
  status: program.status,
});

/** Detalhe completo (escritas + GET /:id). */
export const programToDetailDto = (program: Program): ProgramDetailDto => ({
  id: String(program.id),
  programNumber: program.programNumber,
  name: program.name,
  sigla: String(program.sigla),
  director: program.director,
  generalCharacteristics: program.generalCharacteristics,
  logoKey: program.logoKey,
  status: program.status,
  version: program.version,
  createdAt: program.createdAt.toISOString(),
  updatedAt: program.updatedAt.toISOString(),
});
