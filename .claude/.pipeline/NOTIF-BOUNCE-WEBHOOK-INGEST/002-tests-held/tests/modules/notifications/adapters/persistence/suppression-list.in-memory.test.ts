/**
 * W0 RED — NOTIF-BOUNCE-WEBHOOK-INGEST.
 *
 * Repo in-memory da suppression list (port SuppressionList). Cobre:
 *  - suppress insere e isSuppressed reflete (CA2/CA3 a nivel de port).
 *  - isSuppressed false para destinatario desconhecido.
 *  - suppress idempotente: mesmo destinatario 2x -> 1 entrada, sem erro (CA4 a nivel de port).
 *  - normalizacao: case/trim do destinatario nao cria duplicata.
 *
 * Estes testes falham RED ate o W1 criar:
 *   src/modules/notifications/application/ports/suppression-list.ts
 *   src/modules/notifications/adapters/persistence/repos/suppression-list.in-memory.ts
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  createInMemorySuppressionList,
  type SuppressionStore,
} from '#src/modules/notifications/adapters/persistence/repos/suppression-list.in-memory.ts';
import type { SuppressionEntry } from '#src/modules/notifications/application/ports/suppression-list.ts';

const entry = (over: Partial<SuppressionEntry> = {}): SuppressionEntry => ({
  recipient: 'user@example.com',
  reason: 'bounced',
  occurredAt: new Date('2026-06-19T03:00:00.000Z'),
  ...over,
});

describe('notifications/suppression-list.in-memory', () => {
  it('suppress insere e isSuppressed retorna true', async () => {
    const list = createInMemorySuppressionList();

    const suppressed = await list.suppress(entry());
    assert.equal(suppressed.ok, true);

    const check = await list.isSuppressed('user@example.com');
    assert.equal(check.ok, true);
    assert.equal(check.ok && check.value, true);
  });

  it('isSuppressed retorna false para destinatario desconhecido', async () => {
    const list = createInMemorySuppressionList();

    const check = await list.isSuppressed('ninguem@example.com');
    assert.equal(check.ok, true);
    assert.equal(check.ok && check.value, false);
  });

  it('suppress e idempotente: 2x mesmo destinatario -> 1 entrada, sem erro', async () => {
    const store: SuppressionStore = new Map();
    const list = createInMemorySuppressionList(store);

    const first = await list.suppress(entry({ reason: 'bounced' }));
    const second = await list.suppress(entry({ reason: 'complained' }));

    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    assert.equal(store.size, 1);
  });

  it('normaliza destinatario (case/trim) ao gravar e consultar', async () => {
    const store: SuppressionStore = new Map();
    const list = createInMemorySuppressionList(store);

    await list.suppress(entry({ recipient: '  User@Example.com  ' }));

    const check = await list.isSuppressed('user@example.com');
    assert.equal(check.ok && check.value, true);
    assert.equal(store.size, 1);
  });
});
