/**
 * Roda a suite contratual de EventDelivery contra o adapter InMemoryEventDelivery.
 * CA5: InMemoryEventDelivery adapter funcional.
 */

import { InMemoryEventDelivery } from '#src/modules/contracts/adapters/event-delivery/event-delivery.in-memory.ts';
import { runEventDeliveryContract } from '../../application/ports/event-delivery.contract.ts';

runEventDeliveryContract('InMemory', {
  make: async () => {
    await Promise.resolve();
    const delivery = InMemoryEventDelivery('test-consumer');
    return { delivery };
  },
});
