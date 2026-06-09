import { type Result, ok, err } from '#src/shared/index.ts';
import * as ProgramId from '#src/modules/programs/domain/shared/program-id.ts';
import type { Program as ProgramAggregate } from '#src/modules/programs/domain/program/types.ts';
import type {
  ProgramRepository,
  ProgramRepositoryError,
} from '#src/modules/programs/domain/program/repository.ts';

export type GetProgramCommand = Readonly<{ programId: string }>;

export type GetProgramError = 'program-not-found' | ProgramRepositoryError;

export type GetProgramOutput = Readonly<{ program: ProgramAggregate }>;

type Deps = Readonly<{ programRepo: ProgramRepository }>;

export const getProgram =
  (deps: Deps) =>
  async (cmd: GetProgramCommand): Promise<Result<GetProgramOutput, GetProgramError>> => {
    const id = ProgramId.rehydrate(cmd.programId);
    if (!id.ok) return err('program-not-found'); // id inválido = fail-closed (404)

    const fetched = await deps.programRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('program-not-found');

    return ok({ program: fetched.value });
  };
