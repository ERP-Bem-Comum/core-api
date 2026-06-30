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

export type UpdateProgramCommand = Readonly<{
  programId: string;
  name: string;
  sigla: string;
  director: string | null;
  generalCharacteristics: string | null;
  logoKey: string | null;
  version: number;
}>;

export type UpdateProgramError =
  | ProgramError
  | 'program-not-found'
  | 'program-sigla-duplicated'
  | ProgramRepositoryError;

export type UpdateProgramOutput = Readonly<{ program: ProgramAggregate; event: ProgramEvent }>;

type Deps = Readonly<{ programRepo: ProgramRepository; clock: Clock }>;

// rehydrate id → findById → Program.update (revalida + optimistic-lock) → checa
// duplicidade de sigla contra OUTRO programa → save.
export const updateProgram =
  (deps: Deps) =>
  async (cmd: UpdateProgramCommand): Promise<Result<UpdateProgramOutput, UpdateProgramError>> => {
    const id = ProgramId.rehydrate(cmd.programId);
    if (!id.ok) return err('program-not-found');

    const fetched = await deps.programRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('program-not-found');

    const updated = Program.update(
      fetched.value,
      {
        name: cmd.name,
        sigla: cmd.sigla,
        director: cmd.director,
        generalCharacteristics: cmd.generalCharacteristics,
        logoKey: cmd.logoKey,
      },
      cmd.version,
      deps.clock.now(),
    );
    if (!updated.ok) return updated;

    const bySigla = await deps.programRepo.findBySigla(String(updated.value.program.sigla));
    if (!bySigla.ok) return bySigla;
    if (bySigla.value !== null && String(bySigla.value.id) !== String(updated.value.program.id)) {
      return err('program-sigla-duplicated');
    }

    const saved = await deps.programRepo.save(updated.value.program, [updated.value.event]);
    if (!saved.ok) return saved;

    return ok(updated.value);
  };
