/**
 * Suite de contrato reutilizável para o port `EventDelivery`.
 *
 * - Este arquivo NÃO é descoberto pelo runner de testes (`*.test.ts` apenas).
 * - Adapters (InMemory, Logger) consomem `runEventDeliveryContract` para garantir
 *   comportamento equivalente em todas as implementações.
 *
 * Cenários cobertos (CA2):
 *   1. deliver(event) retorna ok(undefined)
 *   2. deliver registra o ProcessedEvent em deliveredEvents()
 *   3. deliver múltiplos eventos acumula em deliveredEvents()
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import type {
  EventDelivery,
  ProcessedEvent,
} from '#src/modules/contracts/application/ports/event-delivery.ts';
import { isOk } from '#src/shared/index.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as AmendmentId from '#src/modules/contracts/domain/shared/amendment-id.ts';
import type { ContractsModuleEvent } from '#src/modules/contracts/application/ports/event-bus.ts';

// ─── helpers de fixture ────────────────────────────────────────────────────────

const mkProcessedEvent = (event: ContractsModuleEvent): ProcessedEvent => ({
  eventId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  eventType: event.type,
  schemaVersion: 1,
  event,
});

const makeContractCreatedEvent = (): ContractsModuleEvent => ({
  type: 'ContractCreated',
  contractId: ContractId.generate(),
  occurredAt: new Date('2026-01-15T10:00:00.000Z'),
});

const makeAmendmentCreatedEvent = (): ContractsModuleEvent => ({
  type: 'AmendmentCreated',
  amendmentId: AmendmentId.generate(),
  contractId: ContractId.generate(),
  occurredAt: new Date('2026-01-15T10:00:00.000Z'),
});

// ─── factory type ─────────────────────────────────────────────────────────────

export interface EventDeliveryFactory {
  make: () => Promise<{
    delivery: EventDelivery & { deliveredEvents: () => readonly ProcessedEvent[] };
  }>;
}

// ─── suite ────────────────────────────────────────────────────────────────────

export const runEventDeliveryContract = (label: string, factory: EventDeliveryFactory): void => {
  describe(`EventDelivery contract — ${label}`, () => {
    let delivery: EventDelivery & { deliveredEvents: () => readonly ProcessedEvent[] };

    beforeEach(async () => {
      const built = await factory.make();
      delivery = built.delivery;
    });

    it('deliver(event) retorna ok(undefined)', async () => {
      const event = makeContractCreatedEvent();
      const processed = mkProcessedEvent(event);
      const result = await delivery.deliver(processed);
      assert.equal(isOk(result), true);
      if (result.ok) {
        assert.equal(result.value, undefined);
      }
    });

    it('deliver registra o ProcessedEvent em deliveredEvents()', async () => {
      const event = makeContractCreatedEvent();
      const processed = mkProcessedEvent(event);
      await delivery.deliver(processed);

      const delivered = delivery.deliveredEvents();
      assert.equal(delivered.length, 1);
      assert.equal(delivered[0]?.eventType, 'ContractCreated');
      assert.equal(delivered[0]?.schemaVersion, 1);
    });

    it('deliver múltiplos eventos acumula em deliveredEvents()', async () => {
      const e1 = mkProcessedEvent(makeContractCreatedEvent());
      const e2 = mkProcessedEvent(makeAmendmentCreatedEvent());

      await delivery.deliver(e1);
      await delivery.deliver(e2);

      const delivered = delivery.deliveredEvents();
      assert.equal(delivered.length, 2);
    });

    it('consumerId está definido no adapter', () => {
      assert.equal(typeof delivery.consumerId, 'string');
      assert.ok(delivery.consumerId.length > 0, 'consumerId não deve ser vazio');
    });
  });
};
