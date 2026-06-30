import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { InMemoryProgramRepository } from '#src/modules/programs/adapters/persistence/repos/program-repository.in-memory.ts';
import type { ProgramRepository } from '#src/modules/programs/domain/program/repository.ts';

export const NOW = new Date('2026-06-09T12:00:00.000Z');

export const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };

export const makeDeps = (): Readonly<{ programRepo: ProgramRepository; clock: Clock }> => ({
  programRepo: InMemoryProgramRepository().repo,
  clock,
});
