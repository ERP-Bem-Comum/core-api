/**
 * PARTNERS-INVITE-DOMAIN-EVENT — W0 (RED) — schema par_email_outbox (CA1).
 *
 * Verifica a forma da tabela par_email_outbox (prefixo par_, ADR-0014; mapeamentos ADR-0020:
 * varchar/datetime(3)/smallint, payload varchar, sem JSON nativo). Outbox de e-mail DEDICADO
 * (single-consumer email-dispatch), distinto do par_outbox de integracao.
 *
 * DEVE FALHAR em W0: parEmailOutbox ainda nao existe no schema do partners. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { getTableConfig } from 'drizzle-orm/mysql-core';

import { parEmailOutbox } from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';

describe('par_email_outbox schema (PARTNERS-INVITE-DOMAIN-EVENT CA1)', () => {
  it('tabela chama par_email_outbox (prefixo par_ — ADR-0014)', () => {
    const cfg = getTableConfig(parEmailOutbox);
    assert.equal(cfg.name, 'par_email_outbox');
  });

  it('tem as colunas canonicas do outbox (event_id PK, payload, processed_at nullable)', () => {
    const cfg = getTableConfig(parEmailOutbox);
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
