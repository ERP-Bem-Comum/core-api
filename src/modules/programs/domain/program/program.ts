import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { ProgramId } from '../shared/program-id.ts';
import * as Sigla from './sigla.ts';
import type { Program as ProgramEntity } from './types.ts';
import type { ProgramError } from './errors.ts';
import type { ProgramEvent } from './events.ts';

const NAME_MIN_LENGTH = 2;

export type CreateProgramInput = Readonly<{
  id: ProgramId;
  programNumber: number;
  name: string;
  sigla: string;
  director: string | null;
  generalCharacteristics: string | null;
  logoKey: string | null;
  now: Date;
}>;

export type UpdateProgramPatch = Readonly<{
  name: string;
  sigla: string;
  director: string | null;
  generalCharacteristics: string | null;
  logoKey: string | null;
}>;

type Outcome = Result<Readonly<{ program: ProgramEntity; event: ProgramEvent }>, ProgramError>;

const validateName = (raw: string): Result<string, ProgramError> => {
  const trimmed = raw.trim();
  return trimmed.length >= NAME_MIN_LENGTH ? ok(trimmed) : err('program-name-required');
};

const create = (input: CreateProgramInput): Outcome => {
  const name = validateName(input.name);
  if (!name.ok) return name;
  const sigla = Sigla.create(input.sigla);
  if (!sigla.ok) return sigla;

  const program: ProgramEntity = {
    id: input.id,
    programNumber: input.programNumber,
    name: name.value,
    sigla: sigla.value,
    director: input.director,
    generalCharacteristics: input.generalCharacteristics,
    logoKey: input.logoKey,
    status: 'ATIVO',
    version: 1,
    createdAt: input.now,
    updatedAt: input.now,
  };
  return ok({
    program,
    event: { type: 'ProgramCreated', programId: program.id, occurredAt: input.now },
  });
};

const update = (
  program: ProgramEntity,
  patch: UpdateProgramPatch,
  expectedVersion: number,
  now: Date,
): Outcome => {
  if (program.version !== expectedVersion) return err('program-version-conflict');
  const name = validateName(patch.name);
  if (!name.ok) return name;
  const sigla = Sigla.create(patch.sigla);
  if (!sigla.ok) return sigla;

  const next: ProgramEntity = {
    ...program,
    name: name.value,
    sigla: sigla.value,
    director: patch.director,
    generalCharacteristics: patch.generalCharacteristics,
    logoKey: patch.logoKey,
    version: program.version + 1,
    updatedAt: now,
  };
  return ok({
    program: next,
    event: { type: 'ProgramUpdated', programId: next.id, occurredAt: now },
  });
};

const deactivate = (program: ProgramEntity, now: Date): Outcome => {
  if (program.status !== 'ATIVO') return err('program-not-active');
  const next: ProgramEntity = {
    ...program,
    status: 'INATIVO',
    version: program.version + 1,
    updatedAt: now,
  };
  return ok({
    program: next,
    event: { type: 'ProgramDeactivated', programId: next.id, occurredAt: now },
  });
};

const reactivate = (program: ProgramEntity, now: Date): Outcome => {
  if (program.status !== 'INATIVO') return err('program-not-inactive');
  const next: ProgramEntity = {
    ...program,
    status: 'ATIVO',
    version: program.version + 1,
    updatedAt: now,
  };
  return ok({
    program: next,
    event: { type: 'ProgramReactivated', programId: next.id, occurredAt: now },
  });
};

// Agregado exportado como namespace-objeto (sem Brand na casca) — padrao Contract.
export const Program = { create, update, deactivate, reactivate };
