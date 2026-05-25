/**
 * Smoke test para LoggerEventDelivery.
 * CA5: LoggerEventDelivery adapter.
 *
 * Verifica que:
 *   1. deliver() retorna ok(undefined)
 *   2. algo é escrito em stdout (captura via mock de process.stdout.write)
 */

import { describe, it, mock } from 'node:test';
import { strict as assert } from 'node:assert';

import { LoggerEventDelivery } from '#src/modules/contracts/adapters/event-delivery/event-delivery.logger.ts';
import { isOk } from '#src/shared/index.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import type { ProcessedEvent } from '#src/modules/contracts/application/ports/event-delivery.ts';
import type { ContractsModuleEvent } from '#src/modules/contracts/application/ports/event-bus.ts';

const mkProcessedEvent = (): ProcessedEvent => {
  const event: ContractsModuleEvent = {
    type: 'ContractCreated',
    contractId: ContractId.generate(),
    occurredAt: new Date('2026-01-15T10:00:00.000Z'),
  };
  return {
    eventId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    eventType: 'ContractCreated',
    schemaVersion: 1,
    event,
  };
};

describe('LoggerEventDelivery — smoke', () => {
  it('deliver retorna ok(undefined)', async () => {
    const delivery = LoggerEventDelivery('smoke-consumer');
    const processed = mkProcessedEvent();
    const result = await delivery.deliver(processed);
    assert.equal(isOk(result), true);
    if (result.ok) {
      assert.equal(result.value, undefined);
    }
  });

  it('consumerId é o valor passado ao factory', () => {
    const delivery = LoggerEventDelivery('my-consumer-id');
    assert.equal(delivery.consumerId, 'my-consumer-id');
  });

  it('escreve algo em stdout ao fazer deliver', async () => {
    const written: string[] = [];
    const original = process.stdout.write.bind(process.stdout);
    // Intercept stdout writes
    mock.method(process.stdout, 'write', (chunk: unknown) => {
      written.push(String(chunk));
      return true;
    });

    try {
      const delivery = LoggerEventDelivery('stdout-test-consumer');
      const processed = mkProcessedEvent();
      await delivery.deliver(processed);
      assert.ok(written.length > 0, 'LoggerEventDelivery deve escrever em stdout');
      const combined = written.join('');
      assert.ok(
        combined.includes('ContractCreated'),
        `stdout deve conter o eventType; got: ${combined.slice(0, 200)}`,
      );
    } finally {
      mock.restoreAll();
      // Suppress unused-variable warning for original — kept for restoration reference
      void original;
    }
  });
});
