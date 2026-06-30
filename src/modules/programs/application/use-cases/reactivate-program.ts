import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as ProgramId from '#src/modules/programs/domain/shared/program-id.ts';
import { Program } from '#src/modules/programs/domain/program/program.ts';
import type { Program as ProgramAggregate } from '#src/modules/programs/domain/program/types.ts';
import type { ProgramEvent } from '#src/modules/programs/domain/program/events.ts';
import type { ProgramError } from '#src/modules/programs/domain/program/errors.ts';
import type {
  ProgramRepository,
  ProgramRepositoryError,
} from '#src/modules/programs/domain/program/repository.ts';

export type ReactivateProgramCommand = Readonly<{ programId: string }>;

export type ReactivateProgramError = ProgramError | 'program-not-found' | ProgramRepositoryError;

export type ReactivateProgramOutput = Readonly<{ program: ProgramAggregate; event: ProgramEvent }>;

type Deps = Readonly<{ programRepo: ProgramRepository; clock: Clock }>;

export const reactivateProgram =
  (deps: Deps) =>
  async (
    cmd: ReactivateProgramCommand,
  ): Promise<Result<ReactivateProgramOutput, ReactivateProgramError>> => {
    const id = ProgramId.rehydrate(cmd.programId);
    if (!id.ok) return err('program-not-found');

    const fetched = await deps.programRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('program-not-found');

    const reactivated = Program.reactivate(fetched.value, deps.clock.now());
    if (!reactivated.ok) return reactivated;

    const saved = await deps.programRepo.save(reactivated.value.program, [reactivated.value.event]);
    if (!saved.ok) return saved;

    return ok(reactivated.value);
  };
