// Roda as suites de contrato contra os adapters InMemory.
// Quando o W1 entregar o adapter Drizzle/SQLite, criaremos um arquivo
// análogo `drizzle-sqlite.test.ts` chamando as MESMAS suites — qualquer
// divergência semântica falha o build.

import { InMemoryContractRepository } from '#src/modules/contracts/adapters/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/amendment-repository.in-memory.ts';

import { runContractRepositoryContract } from './contract-repository.suite.ts';
import { runAmendmentRepositoryContract } from './amendment-repository.suite.ts';

// InMemory é síncrono; cada `beforeEach` constrói um handle novo, então não
// precisamos de teardown — o repo anterior é descartado pelo GC.
// `await Promise.resolve()` satisfaz a interface async dos factories
// (que o adapter Drizzle/SQLite vai exigir) sem inventar I/O fake.

runContractRepositoryContract('InMemory', {
  make: async () => {
    await Promise.resolve();
    return { repo: InMemoryContractRepository().repo };
  },
});

runAmendmentRepositoryContract('InMemory', {
  make: async () => {
    await Promise.resolve();
    return {
      repo: InMemoryAmendmentRepository().repo,
      // InMemory não tem FK — seed é no-op.
      seedContract: async () => {
        await Promise.resolve();
      },
    };
  },
});
