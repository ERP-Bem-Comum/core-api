/**
 * Roda a suite contratual de OutboxPort contra o adapter InMemoryOutbox.
 * CA4: InMemoryOutbox adapter funcional.
 */

import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { runOutboxContract } from '../../application/ports/outbox.contract.ts';

runOutboxContract('InMemory', {
  make: async () => {
    await Promise.resolve();
    const outbox = InMemoryOutbox();
    return {
      port: outbox.port,
      helpers: {
        all: outbox.all,
        pending: outbox.pending,
        markProcessed: outbox.markProcessedSync,
      },
    };
  },
});
