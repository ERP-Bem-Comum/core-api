import type { Clock } from '#src/shared/ports/clock.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { InMemoryProgramRepository } from '#src/modules/programs/adapters/persistence/repos/program-repository.in-memory.ts';
import type { ProgramRepository } from '#src/modules/programs/domain/program/repository.ts';

export const NOW = new Date('2026-06-09T12:00:00.000Z');

export const clock: Clock = ClockFixed(NOW);

export const makeDeps = (): Readonly<{ programRepo: ProgramRepository; clock: Clock }> => ({
  programRepo: InMemoryProgramRepository().repo,
  clock,
});
