/**
 * CORE-MIGRATE-JOB — Slice A — Wave W0 (RED) — CA4
 *
 * `readMigrateConfig(env)` — função pura que lê `MIGRATE_DATABASE_URL`. Ausente,
 * vazia ou só-espaços → err (run.ts traduz para exit 78 / EX_CONFIG). Espelha o
 * `readJobConfig` do sweeper (falha rápida antes de abrir qualquer handle).
 *
 * RED esperado: `src/jobs/migrate/config.ts` ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { readMigrateConfig } from '#src/jobs/migrate/config.ts';

describe('readMigrateConfig — CORE-MIGRATE-JOB W0 (CA4)', () => {
  it('CA4a: env sem MIGRATE_DATABASE_URL → err', () => {
    const r = readMigrateConfig({});
    assert.ok(!r.ok, 'esperado err quando a env está ausente');
  });

  it('CA4b: MIGRATE_DATABASE_URL vazia → err', () => {
    const r = readMigrateConfig({ MIGRATE_DATABASE_URL: '' });
    assert.ok(!r.ok, 'esperado err quando a env é string vazia');
  });

  it('CA4c: MIGRATE_DATABASE_URL só com espaços → err', () => {
    const r = readMigrateConfig({ MIGRATE_DATABASE_URL: '   ' });
    assert.ok(!r.ok, 'esperado err quando a env é só espaços');
  });

  it('CA4d: MIGRATE_DATABASE_URL válida → ok com a connection string', () => {
    const url = 'mysql://core_app:x@mysql:3306/core';
    const r = readMigrateConfig({ MIGRATE_DATABASE_URL: url });
    assert.ok(r.ok, `esperado ok, foi ${JSON.stringify(r)}`);
    assert.equal(r.value.connectionString, url);
  });
});
