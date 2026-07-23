// Integração: claimJobRun (coordenação de jobs one-shot em multi-instância — CTR-SWEEPER-JOB-LOCK).
//
// INSERT IGNORE em `ctr_job_runs` (PK job_name+run_key): a 1ª instância adquire (true), as demais
// batem na PK e desistem (false). Backstop barato p/ "só uma instância roda o cron do dia"
// (ADR-0041; ver .claude/.planning/SHARED-STORE-AND-JOB-COORDINATION.md — Kleppmann: lock de eficiência).
// GATE: MYSQL_INTEGRATION=1. DEVE FALHAR em W0 (claimJobRun inexistente — erro já no import).

import { describe, before, after, it } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { newUuid } from '#src/shared/utils/id.ts';
import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { claimJobRun } from '#src/modules/contracts/adapters/persistence/repos/job-run.drizzle.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write('[contracts:job-run] MYSQL_INTEGRATION não definido — pulando.\n');
} else {
  const connectionString = process.env['CONTRACTS_DATABASE_URL'] ?? mysqlTestConnectionString();

  describe('claimJobRun — coordenação de jobs (integração)', () => {
    let handle: MysqlHandle;
    const NOW = new Date('2026-06-17T03:05:00.000Z');

    before(async () => {
      const r = await openMysql({ connectionString, applyMigrations: true });
      if (!r.ok) throw new Error(`[job-run] ${r.error}`);
      handle = r.value;
    });
    after(async () => {
      await handle?.close();
    });

    it('1ª chamada adquire (true); 2ª com a mesma chave não adquire (false)', async () => {
      const runKey = newUuid();
      const first = await claimJobRun(handle, 'contracts-sweeper', runKey, NOW);
      assert.equal(first.ok, true);
      if (first.ok) assert.equal(first.value, true);

      const second = await claimJobRun(handle, 'contracts-sweeper', runKey, NOW);
      assert.equal(second.ok, true);
      if (second.ok) assert.equal(second.value, false);
    });

    it('chave diferente (outro dia) adquire normalmente', async () => {
      const r = await claimJobRun(handle, 'contracts-sweeper', newUuid(), NOW);
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value, true);
    });
  });
}
