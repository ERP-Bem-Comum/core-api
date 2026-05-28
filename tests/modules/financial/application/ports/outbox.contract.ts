/**
 * Suite de contrato reutilizável para o port `OutboxPort` do módulo Financial.
 *
 * - Este arquivo NÃO é descoberto pelo runner de testes (`*.test.ts` apenas).
 * - Adapters (InMemory, futuramente Drizzle/MySQL) consomem `runOutboxContract`
 *   dentro do próprio `describe()` para garantir comportamento equivalente em
 *   todas as implementações.
 *
 * Pattern espelha `tests/modules/contracts/application/ports/outbox.contract.ts`.
 *
 * Cenários cobertos (CAs do request FIN-PORT-OUTBOX):
 *   CA-10: append([]) é no-op — retorna ok(undefined), sem mudar all().
 *   CA-11: append([evt]) registra 1 row com processedAt: null e attempts: 0.
 *   CA-12: append([e1, e2]) registra 2 rows preservando ordem.
 *   CA-13: pending() filtra apenas rows com processedAt === null.
 *   CA-14: markProcessedSync(eventId) move row de pending → processed.
 *   Shape: row tem campos mínimos (eventId, eventType, processedAt, attempts, occurredAt).
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import type { OutboxPort } from '#src/modules/financial/application/ports/outbox.ts';
import type { FinancialOutboxRow } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import type { FinancialModuleEvent } from '#src/modules/financial/public-api/events.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';

// ─── helpers de fixture ────────────────────────────────────────────────────────

const mkPayableId = () => PayableId.generate();
const mkDate = () => new Date('2026-01-15T10:00:00.000Z');

const makePayableOpenedEvent = (): FinancialModuleEvent => ({
  type: 'PayableOpened',
  payableId: mkPayableId(),
  occurredAt: mkDate(),
});

const makePayableMarkedOverdueEvent = (): FinancialModuleEvent => ({
  type: 'PayableMarkedOverdue',
  payableId: mkPayableId(),
  occurredAt: new Date('2026-01-16T10:00:00.000Z'),
});

// ─── factory type ─────────────────────────────────────────────────────────────

export interface OutboxFactory {
  make: () => Promise<{
    port: OutboxPort;
    helpers: {
      all: () => readonly FinancialOutboxRow[];
      pending: () => readonly FinancialOutboxRow[];
      markProcessed: (eventId: string) => void;
    };
  }>;
}

// ─── suite ────────────────────────────────────────────────────────────────────

export const runOutboxContract = (label: string, factory: OutboxFactory): void => {
  describe(`OutboxPort contract — ${label}`, () => {
    let port: OutboxPort;
    let helpers: {
      all: () => readonly FinancialOutboxRow[];
      pending: () => readonly FinancialOutboxRow[];
      markProcessed: (eventId: string) => void;
    };

    beforeEach(async () => {
      const built = await factory.make();
      port = built.port;
      helpers = built.helpers;
    });

    it('CA-10: append([]) é no-op e retorna ok(undefined)', async () => {
      const result = await port.append([]);
      assert.equal(isOk(result), true);
      if (result.ok) {
        assert.equal(result.value, undefined);
      }
      assert.equal(helpers.all().length, 0);
    });

    it('CA-11: append([evt]) registra 1 row com processedAt null e attempts 0', async () => {
      const event = makePayableOpenedEvent();
      const result = await port.append([event]);
      assert.equal(isOk(result), true);

      const rows = helpers.all();
      assert.equal(rows.length, 1);
      const row = rows[0];
      assert.ok(row !== undefined, 'row deve existir');
      assert.equal(row.processedAt, null);
      assert.equal(row.attempts, 0);
      assert.equal(row.eventType, 'PayableOpened');
    });

    it('CA-12: append([e1, e2]) registra 2 rows preservando ordem', async () => {
      const e1 = makePayableOpenedEvent();
      const e2 = makePayableMarkedOverdueEvent();
      const result = await port.append([e1, e2]);
      assert.equal(isOk(result), true);

      const rows = helpers.all();
      assert.equal(rows.length, 2);
      const first = rows[0];
      const second = rows[1];
      assert.ok(first !== undefined && second !== undefined);
      assert.equal(first.eventType, 'PayableOpened');
      assert.equal(second.eventType, 'PayableMarkedOverdue');
    });

    it('CA-13: pending() retorna apenas rows com processedAt null', async () => {
      const e1 = makePayableOpenedEvent();
      const e2 = makePayableMarkedOverdueEvent();
      await port.append([e1, e2]);
      assert.equal(helpers.pending().length, 2);

      const first = helpers.all()[0];
      assert.ok(first !== undefined);
      helpers.markProcessed(first.eventId);
      assert.equal(helpers.pending().length, 1);
    });

    it('CA-14: markProcessedSync move row de pending para processed', async () => {
      const event = makePayableOpenedEvent();
      await port.append([event]);

      const rowBefore = helpers.all()[0];
      assert.ok(rowBefore !== undefined);
      assert.equal(rowBefore.processedAt, null);

      helpers.markProcessed(rowBefore.eventId);

      const rowAfter = helpers.all()[0];
      assert.ok(rowAfter !== undefined);
      assert.ok(
        rowAfter.processedAt instanceof Date,
        'processedAt deve virar Date após markProcessed',
      );
      assert.equal(helpers.pending().length, 0);
    });

    it('shape: row tem eventId, eventType, processedAt, attempts, occurredAt', async () => {
      const event = makePayableOpenedEvent();
      await port.append([event]);

      const row = helpers.all()[0];
      assert.ok(row !== undefined);
      assert.equal(typeof row.eventId, 'string', 'eventId é string');
      assert.equal(typeof row.eventType, 'string', 'eventType é string');
      assert.ok(
        row.processedAt === null || row.processedAt instanceof Date,
        'processedAt é Date | null',
      );
      assert.equal(typeof row.attempts, 'number', 'attempts é number');
      assert.ok(row.occurredAt instanceof Date, 'occurredAt é Date');
    });
  });
};
