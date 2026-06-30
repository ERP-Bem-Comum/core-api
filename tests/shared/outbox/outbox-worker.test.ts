/**
 * CORE-OUTBOX-WORKER-GENERIC · W0 — worker de outbox genérico compartilhado.
 *
 * `runOnce<P>`/`runLoop<P>` parametrizados por `rowToProcessed` (contracts desserializa;
 * partners usa payload opaco). Comportamento idêntico aos workers atuais de contracts/partners.
 *
 * DEVE FALHAR em W0 (`#src/shared/outbox/` inexistente).
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { runOnce, runLoop } from '#src/shared/outbox/index.ts';
import type {
  OutboxRow,
  OutboxBatchOps,
  WorkerOutboxOps,
  EventDelivery,
  WorkerConfig,
  RowToProcessed,
} from '#src/shared/outbox/index.ts';
import { deliveryUnavailable } from '#src/shared/outbox/index.ts';

const NOW = new Date('2026-06-16T21:00:00.000Z');
const clock: Clock = { now: () => NOW, today: () => PlainDate.fromDate(NOW) };

const CONFIG: WorkerConfig = { batchSize: 10, maxAttempts: 5, pollIntervalMs: 1, idleSleepMs: 1 };

type Processed = Readonly<{ id: string }>;

const makeRow = (over: Partial<OutboxRow> = {}): OutboxRow => ({
  eventId: 'e1',
  aggregateId: 'a1',
  aggregateType: 'T',
  eventType: 'X',
  schemaVersion: 1,
  occurredAt: NOW,
  enqueuedAt: NOW,
  processedAt: null,
  attempts: 0,
  payload: '{}',
  ...over,
});

interface Calls {
  processed: string[];
  failed: { id: string; attempt: number }[];
  dlq: { id: string; msg: string }[];
  delivered: string[];
}

const makeOutbox = (rows: readonly OutboxRow[]): { outbox: WorkerOutboxOps; calls: Calls } => {
  const calls: Calls = { processed: [], failed: [], dlq: [], delivered: [] };
  const ops: OutboxBatchOps = {
    markProcessed: (id) => {
      calls.processed.push(id);
      return Promise.resolve(ok(undefined));
    },
    markFailed: (id, _now, _tag, attempt) => {
      calls.failed.push({ id, attempt });
      return Promise.resolve(ok(undefined));
    },
    moveToDeadLetter: (id, _now, msg) => {
      calls.dlq.push({ id, msg });
      return Promise.resolve(ok(undefined));
    },
  };
  const outbox: WorkerOutboxOps = {
    withPendingBatch: async (limit, handler) => ok(await handler(rows.slice(0, limit), ops)),
    findPendingForUpdate: () => Promise.resolve(ok(rows)),
    markProcessed: ops.markProcessed,
    markFailed: ops.markFailed,
    moveToDeadLetter: ops.moveToDeadLetter,
  };
  return { outbox, calls };
};

const okMap: RowToProcessed<Processed> = (row) => ok({ id: row.eventId });

const delivery = (
  impl: EventDelivery<Processed>['deliver'],
  calls?: Calls,
): EventDelivery<Processed> => ({
  consumerId: 'test',
  deliver: (p) => {
    calls?.delivered.push(p.id);
    return impl(p);
  },
});

describe('runOnce genérico', () => {
  let env: { outbox: WorkerOutboxOps; calls: Calls };
  beforeEach(() => {
    env = makeOutbox([makeRow()]);
  });

  it('CA1: delivery ok → markProcessed; delivered=1', async () => {
    const r = await runOnce(
      {
        outbox: env.outbox,
        delivery: delivery(() => Promise.resolve(ok(undefined)), env.calls),
        rowToProcessed: okMap,
        clock,
        tag: '[t] ',
      },
      CONFIG,
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.delivered, 1);
    assert.deepEqual(env.calls.processed, ['e1']);
    assert.equal(env.calls.failed.length, 0);
  });

  it('CA2: delivery err, attempts<max → markFailed; failed=1', async () => {
    const r = await runOnce(
      {
        outbox: env.outbox,
        delivery: delivery(() => Promise.resolve(err(deliveryUnavailable('x')))),
        rowToProcessed: okMap,
        clock,
        tag: '[t] ',
      },
      CONFIG,
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.failed, 1);
    assert.equal(env.calls.failed.length, 1);
    assert.equal(env.calls.failed[0]?.attempt, 1);
    assert.equal(env.calls.dlq.length, 0);
  });

  it('CA3: delivery err, attempts+1>=max → DLQ; movedToDeadLetter=1', async () => {
    const e = makeOutbox([makeRow({ attempts: 4 })]);
    const r = await runOnce(
      {
        outbox: e.outbox,
        delivery: delivery(() => Promise.resolve(err(deliveryUnavailable('x')))),
        rowToProcessed: okMap,
        clock,
        tag: '[t] ',
      },
      CONFIG,
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.movedToDeadLetter, 1);
    assert.equal(e.calls.dlq.length, 1);
    assert.equal(e.calls.failed.length, 0);
  });

  it('CA4: rowToProcessed err → DLQ direto, sem deliver', async () => {
    const r = await runOnce(
      {
        outbox: env.outbox,
        delivery: delivery(() => Promise.resolve(ok(undefined)), env.calls),
        rowToProcessed: () => err({ tag: 'corrupt' }),
        clock,
        tag: '[t] ',
      },
      CONFIG,
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.movedToDeadLetter, 1);
    assert.equal(env.calls.dlq.length, 1);
    assert.equal(env.calls.delivered.length, 0);
  });

  it('CA5: deliver que rejeita → tratado como err (markFailed), não aborta', async () => {
    const r = await runOnce(
      {
        outbox: env.outbox,
        delivery: delivery(() => Promise.reject(new Error('boom'))),
        rowToProcessed: okMap,
        clock,
        tag: '[t] ',
      },
      CONFIG,
    );
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.failed, 1);
    assert.equal(env.calls.failed.length, 1);
  });
});

describe('runLoop genérico', () => {
  it('CA6: AbortSignal já abortado → retorna stats zerado sem processar', async () => {
    const env = makeOutbox([makeRow()]);
    const controller = new AbortController();
    controller.abort();
    const stats = await runLoop(
      {
        outbox: env.outbox,
        delivery: delivery(() => Promise.resolve(ok(undefined)), env.calls),
        rowToProcessed: okMap,
        clock,
        tag: '[t] ',
        abortSignal: controller.signal,
      },
      CONFIG,
    );
    assert.equal(stats.delivered, 0);
    assert.equal(env.calls.processed.length, 0);
  });
});
