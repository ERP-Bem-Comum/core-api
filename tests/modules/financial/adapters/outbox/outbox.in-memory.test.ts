/**
 * Test runner para `InMemoryOutbox` consumindo a suite contratual compartilhada.
 *
 * Pattern: `tests/modules/contracts/adapters/outbox/outbox.in-memory.test.ts`.
 *
 * Quando o adapter Drizzle/MySQL real existir (`FIN-ADAPTER-OUTBOX-DRIZZLE`),
 * outro arquivo `.test.ts` consumirá a MESMA suite com factory diferente.
 *
 * Cobre CAs do request FIN-PORT-OUTBOX:
 *   CA-9:  factory expõe port + 4 helpers (all, pending, markProcessedSync, clear).
 *   CA-15: clear() esvazia rows + seenIds.
 *   CA-16: detecção de eventId duplicado via seenIds (branch lógico documentado).
 *   CA-10..14 + shape: via `runOutboxContract`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { InMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import type { FinancialModuleEvent } from '#src/modules/financial/public-api/events.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';

import { runOutboxContract } from '../../application/ports/outbox.contract.ts';

// ─── shape (CA-9) ──────────────────────────────────────────────────────────────

describe('InMemoryOutbox — shape (CA-9)', () => {
  it('factory expõe port + 4 helpers (all, pending, markProcessedSync, clear)', () => {
    const outbox = InMemoryOutbox();
    assert.equal(typeof outbox.port.append, 'function', 'port.append');
    assert.equal(typeof outbox.all, 'function', 'all');
    assert.equal(typeof outbox.pending, 'function', 'pending');
    assert.equal(typeof outbox.markProcessedSync, 'function', 'markProcessedSync');
    assert.equal(typeof outbox.clear, 'function', 'clear');
  });
});

// ─── suite contratual (CA-10..14 + shape) ──────────────────────────────────────

runOutboxContract('InMemory', {
  // eslint-disable-next-line @typescript-eslint/require-await
  make: async () => {
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

// ─── específicos do InMemory (CA-15, CA-16) ────────────────────────────────────

describe('InMemoryOutbox — clear (CA-15)', () => {
  it('clear() esvazia rows e seenIds', async () => {
    const outbox = InMemoryOutbox();
    const event: FinancialModuleEvent = {
      type: 'PayableOpened',
      payableId: PayableId.generate(),
      occurredAt: new Date('2026-01-15T10:00:00.000Z'),
    };

    await outbox.port.append([event]);
    assert.equal(outbox.all().length, 1);

    outbox.clear();
    assert.equal(outbox.all().length, 0);
    assert.equal(outbox.pending().length, 0);
  });
});

describe('InMemoryOutbox — eventId generation per append (CA-16)', () => {
  it('dois appends do MESMO event object geram 2 rows com eventIds distintos (UUID por append)', async () => {
    // Documenta comportamento: o adapter gera um UUID novo por evento a cada
    // append, então duplicação por reuso de event object NÃO ocorre. A
    // detecção de duplicate via `seenIds` ainda existe no código (defesa em
    // profundidade — alinha com semântica da PK do banco no adapter Drizzle
    // futuro), mas só dispara se o caller fornecer eventId explícito (caso
    // não coberto na API pública atual).
    const outbox = InMemoryOutbox();
    const event: FinancialModuleEvent = {
      type: 'PayableOpened',
      payableId: PayableId.generate(),
      occurredAt: new Date('2026-01-15T10:00:00.000Z'),
    };

    const first = await outbox.port.append([event]);
    const second = await outbox.port.append([event]);

    assert.equal(isOk(first), true);
    assert.equal(isOk(second), true);

    const rows = outbox.all();
    assert.equal(rows.length, 2, 'cada append produz uma row');
    const r1 = rows[0];
    const r2 = rows[1];
    assert.ok(r1 !== undefined && r2 !== undefined);
    assert.notEqual(r1.eventId, r2.eventId, 'eventIds são distintos (UUID por append)');
  });
});
