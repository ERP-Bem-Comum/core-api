/**
 * AUTH-DOMAIN-OUTBOX — W0 (RED) — schema auth_outbox (CA1).
 *
 * Verifica a forma da tabela auth_outbox (prefixo auth, ADR-0014; mapeamentos ADR-0020:
 * varchar/datetime(3)/smallint, payload varchar, sem JSON nativo). DEVE FALHAR em W0:
 * authOutbox ainda nao existe no schema do auth. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { getTableConfig } from 'drizzle-orm/mysql-core';

import { authOutbox } from '#src/modules/auth/adapters/persistence/schemas/mysql.ts';

describe('auth_outbox schema (AUTH-DOMAIN-OUTBOX CA1)', () => {
  it('tabela chama auth_outbox (prefixo auth — ADR-0014)', () => {
    const cfg = getTableConfig(authOutbox);
    assert.equal(cfg.name, 'auth_outbox');
  });

  it('tem as colunas canonicas do outbox (event_id PK, payload, processed_at nullable)', () => {
    const cfg = getTableConfig(authOutbox);
    const cols = new Map(cfg.columns.map((c) => [c.name, c]));
    const expected = [
      'event_id',
      'aggregate_id',
      'aggregate_type',
      'event_type',
      'schema_version',
      'occurred_at',
      'enqueued_at',
      'processed_at',
      'attempts',
      'payload',
    ];
    for (const name of expected) {
      assert.equal(cols.has(name), true, `coluna ausente: ${name}`);
    }
    assert.equal(cols.get('event_id')?.primary, true);
    assert.equal(cols.get('processed_at')?.notNull, false);
    assert.equal(cols.get('payload')?.notNull, true);
  });
});
