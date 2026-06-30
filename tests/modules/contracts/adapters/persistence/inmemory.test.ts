// Roda as suites de contrato contra os adapters InMemory.
// W0 RED — CTR-OUTBOX-INTEGRATION-IN-REPOS:
//   InMemoryContractRepository e InMemoryAmendmentRepository agora recebem
//   OutboxPort como argumento. InMemoryOutbox é injetado aqui.
//   Cada `beforeEach` cria um InMemoryOutbox fresco (estado isolado por teste).

import { InMemoryContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.in-memory.ts';
import { InMemoryAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';

import { runContractRepositoryContract } from './contract-repository.suite.ts';
import { runAmendmentRepositoryContract } from './amendment-repository.suite.ts';

// InMemory é síncrono; cada `beforeEach` constrói handle novo (descartado pelo GC).
// `await Promise.resolve()` satisfaz a interface async dos factories.

runContractRepositoryContract('InMemory', {
  make: async () => {
    await Promise.resolve();
    const outbox = InMemoryOutbox();
    return { repo: InMemoryContractRepository(outbox.port).repo };
  },
});

runAmendmentRepositoryContract('InMemory', {
  make: async () => {
    await Promise.resolve();
    const outbox = InMemoryOutbox();
    return {
      repo: InMemoryAmendmentRepository(outbox.port).repo,
      // InMemory não tem FK — seed é no-op.
      seedContract: async () => {
        await Promise.resolve();
      },
    };
  },
});
