/**
 * Consumer da suite contratual DocumentRepository contra adapter InMemory.
 *
 * Ticket: CTR-DOCUMENT-AGGREGATE-PERSISTENCE (W0).
 *
 * ASCII puro.
 */

import { InMemoryDocumentRepository } from '#src/modules/contracts/adapters/persistence/repos/document-repository.in-memory.ts';
import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';

import { runDocumentRepositoryContract } from '../document-repository.suite.ts';

runDocumentRepositoryContract('InMemory', {
  make: async () => {
    await Promise.resolve();
    const outbox = InMemoryOutbox();
    const repo = InMemoryDocumentRepository(outbox.port);
    return {
      repo: repo.repo,
      outboxCount: async () => {
        await Promise.resolve();
        return outbox.all().length;
      },
    };
  },
});
