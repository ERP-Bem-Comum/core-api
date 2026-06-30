/**
 * CORE-MIGRATE-JOB — Slice A — Wave W0 (RED)
 *
 * Orquestrador puro `runMigrations`: recebe a lista de migradores de módulo e a
 * connection string, aplica em ordem determinística, fail-fast na 1ª falha.
 * Testável sem DB (fakes recordam a ordem de chamada).
 *
 * RED esperado: `src/jobs/migrate/migrate.ts` ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { runMigrations, type ModuleMigrator } from '#src/jobs/migrate/migrate.ts';
import { ok, err, type Result } from '#src/shared/primitives/result.ts';

const recordingMigrator = (
  module: string,
  outcome: Result<true, string>,
  calls: string[],
): ModuleMigrator => ({
  module,
  apply: (_connectionString: string) => {
    calls.push(module);
    return Promise.resolve(outcome);
  },
});

const CONN = 'mysql://core_app:x@mysql:3306/core';

describe('runMigrations (orquestrador puro) — CORE-MIGRATE-JOB W0', () => {
  it('CA2: todos os migradores ok → ok com a lista de módulos migrados', async () => {
    const calls: string[] = [];
    const migrators = [
      recordingMigrator('auth', ok(true), calls),
      recordingMigrator('contracts', ok(true), calls),
      recordingMigrator('programs', ok(true), calls),
    ];
    const r = await runMigrations(migrators, CONN);
    assert.ok(r.ok, `esperado ok, foi ${JSON.stringify(r)}`);
    assert.deepEqual(r.value, ['auth', 'contracts', 'programs']);
    assert.deepEqual(calls, ['auth', 'contracts', 'programs']);
  });

  it('CA3: fail-fast — módulo k falha → err identifica o módulo e os seguintes NÃO são chamados', async () => {
    const calls: string[] = [];
    const migrators = [
      recordingMigrator('auth', ok(true), calls),
      recordingMigrator('contracts', err('mysql-driver-migrate-failed'), calls),
      recordingMigrator('programs', ok(true), calls),
    ];
    const r = await runMigrations(migrators, CONN);
    assert.ok(!r.ok, 'esperado err');
    assert.equal(r.error.module, 'contracts');
    assert.equal(r.error.error, 'mysql-driver-migrate-failed');
    assert.deepEqual(calls, ['auth', 'contracts'], 'programs não deveria ser chamado (fail-fast)');
  });

  it('CA5: preserva a ordem determinística dos migradores', async () => {
    const calls: string[] = [];
    const order = ['auth', 'contracts', 'financial', 'notifications', 'partners', 'programs'];
    const migrators = order.map((m) => recordingMigrator(m, ok(true), calls));
    const r = await runMigrations(migrators, CONN);
    assert.ok(r.ok);
    assert.deepEqual(calls, order);
  });

  it('CA-obs1: onMigrated é chamado por módulo migrado, na ordem', async () => {
    const calls: string[] = [];
    const reported: string[] = [];
    const migrators = [
      recordingMigrator('auth', ok(true), calls),
      recordingMigrator('contracts', ok(true), calls),
    ];
    const r = await runMigrations(migrators, CONN, (m) => {
      reported.push(m);
    });
    assert.ok(r.ok);
    assert.deepEqual(reported, ['auth', 'contracts']);
  });

  it('CA-obs2: onMigrated NÃO é chamado para o módulo que falha nem os seguintes', async () => {
    const calls: string[] = [];
    const reported: string[] = [];
    const migrators = [
      recordingMigrator('auth', ok(true), calls),
      recordingMigrator('contracts', err('mysql-driver-migrate-failed'), calls),
      recordingMigrator('programs', ok(true), calls),
    ];
    const r = await runMigrations(migrators, CONN, (m) => {
      reported.push(m);
    });
    assert.ok(!r.ok);
    assert.deepEqual(reported, ['auth'], 'só auth migrou antes da falha');
  });
});
