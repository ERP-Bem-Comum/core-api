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

export type CreateProgramCommand = Readonly<{
  name: string;
  sigla: string;
  director: string | null;
  generalCharacteristics: string | null;
  logoKey: string | null;
}>;

export type CreateProgramError = ProgramError | 'program-sigla-duplicated' | ProgramRepositoryError;

export type CreateProgramOutput = Readonly<{ program: ProgramAggregate; event: ProgramEvent }>;

type Deps = Readonly<{ programRepo: ProgramRepository; clock: Clock }>;

// validar (Program.create) → fetch (duplicidade) → persist (state + outbox). A sigla é
// normalizada pelo domínio; a duplicidade compara o valor já normalizado (case-insensitive).
// UNIQUE no schema é a rede de segurança final.
export const createProgram =
  (deps: Deps) =>
  async (cmd: CreateProgramCommand): Promise<Result<CreateProgramOutput, CreateProgramError>> => {
    const next = await deps.programRepo.nextProgramNumber();
    if (!next.ok) return next;

    const created = Program.create({
      id: ProgramId.generate(),
      programNumber: next.value,
      name: cmd.name,
      sigla: cmd.sigla,
      director: cmd.director,
      generalCharacteristics: cmd.generalCharacteristics,
      logoKey: cmd.logoKey,
      now: deps.clock.now(),
    });
    if (!created.ok) return created;

    const existing = await deps.programRepo.findBySigla(String(created.value.program.sigla));
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('program-sigla-duplicated');

    const saved = await deps.programRepo.save(created.value.program, [created.value.event]);
    if (!saved.ok) return saved;

    return ok(created.value);
  };
