/**
 * Roda a suite contratual de OutboxPort contra o adapter InMemoryOutbox.
 * CA4: InMemoryOutbox adapter funcional.
 */

import { InMemoryOutbox } from '#src/modules/contracts/adapters/outbox/outbox.in-memory.ts';
import { runOutboxContract } from '../../application/ports/outbox.contract.ts';

// A suite contratual verifica comportamento genérico do outbox, indiferente a QUAL consumidor —
// `pending`/`markProcessed` seguem síncronos e sem `consumerId` na interface dela (#800/#824
// introduziu o parâmetro só na interface do worker); aqui fixamos um consumidor de teste único.
const CONSUMER_ID = 'outbox-contract-test';

runOutboxContract('InMemory', {
  make: async () => {
    await Promise.resolve();
    const outbox = InMemoryOutbox();
    return {
      port: outbox.port,
      helpers: {
        all: outbox.all,
        pending: () => outbox.pendingFor(CONSUMER_ID),
        markProcessed: (eventId) => {
          outbox.markProcessedSync(CONSUMER_ID, eventId);
        },
      },
    };
  },
});
