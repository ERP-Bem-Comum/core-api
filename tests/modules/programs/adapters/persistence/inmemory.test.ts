import { InMemoryProgramRepository } from '#src/modules/programs/adapters/persistence/repos/program-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/programs/adapters/outbox/outbox.in-memory.ts';
import { runProgramRepositoryContract } from './program-repository.suite.ts';

runProgramRepositoryContract('InMemory', {
  make: async () => {
    await Promise.resolve();
    const outbox = InMemoryOutbox();
    return { repo: InMemoryProgramRepository(outbox.port).repo };
  },
});
