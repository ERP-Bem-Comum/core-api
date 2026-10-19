/**
 * Integração (#1024) — número do contrato informável: o que só o MySQL prova.
 *
 *   1. `nextSequentialNumber` PULA números informados à mão (nas duas grafias, `0050` e `050`) e
 *      grava o contador no número entregue — sem levar o contador ao maior informado.
 *   2. Corrida: o `save` que viola o `UNIQUE(sequential_number)` devolve `contract-repo-conflict`
 *      (o use case o traduz em 409), não `contract-repo-unavailable` (503).
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `contracts`).
 *
 * Contrato de isolamento (testing.md): mexe só nos PRÓPRIOS ids e no ano 2098 do contador — limpa
 * os dois na ENTRADA e na SAÍDA; order-independent; não trunca tabela.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq, inArray } from 'drizzle-orm';

import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';
import { buildContract } from './fixtures.ts';

if (process.env['MYSQL_INTEGRATION'] !== '1') {
  process.stdout.write(
    '[contracts:sequential-number-informed] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString = process.env['CONTRACTS_DATABASE_URL'] ?? mysqlTestConnectionString();
  const YEAR = 2098;
  const ID_MANUAL_A = 'e1024000-0000-4000-8000-00000000000a';
  const ID_MANUAL_B = 'e1024000-0000-4000-8000-00000000000b';
  const ID_RACE_1 = 'e1024000-0000-4000-8000-00000000000c';
  const ID_RACE_2 = 'e1024000-0000-4000-8000-00000000000d';
  const IDS = [ID_MANUAL_A, ID_MANUAL_B, ID_RACE_1, ID_RACE_2];

  describe('#1024 — Drizzle + MySQL: número informado × gerador × UNIQUE', () => {
    let handle: MysqlHandle;

    const cleanup = async (): Promise<void> => {
      const { db, schema } = handle;
      await db.delete(schema.ctrOutbox).where(inArray(schema.ctrOutbox.aggregateId, IDS));
      await db.delete(schema.contracts).where(inArray(schema.contracts.id, IDS));
      await db.delete(schema.ctrContractSeq).where(eq(schema.ctrContractSeq.year, YEAR));
    };

    before(async () => {
      const r = await openMysql({ connectionString, applyMigrations: true });
      if (!r.ok) throw new Error(`fixture: openMysql falhou — ${r.error}`);
      handle = r.value;
    });

    beforeEach(cleanup);

    after(async () => {
      await cleanup();
      await handle.close();
    });

    it('o gerador pula as grafias ocupadas e grava o contador no número entregue', async () => {
      const repo = createDrizzleContractRepository(handle);
      // Informados à mão: 0002 (4 dígitos) e 003 (grafia legada de 3).
      const a = buildContract({ id: ID_MANUAL_A, sequentialNumber: `0002/${String(YEAR)}` });
      const b = buildContract({ id: ID_MANUAL_B, sequentialNumber: `003/${String(YEAR)}` });
      assert.deepEqual(await repo.save(a, []), { ok: true, value: undefined });
      assert.deepEqual(await repo.save(b, []), { ok: true, value: undefined });

      const first = await repo.nextSequentialNumber(YEAR);
      assert.deepEqual(first, { ok: true, value: `0001/${String(YEAR)}` });
      const second = await repo.nextSequentialNumber(YEAR);
      assert.deepEqual(second, { ok: true, value: `0004/${String(YEAR)}` });

      const { db, schema } = handle;
      const seq = await db
        .select({ lastSeq: schema.ctrContractSeq.lastSeq })
        .from(schema.ctrContractSeq)
        .where(eq(schema.ctrContractSeq.year, YEAR));
      assert.equal(seq[0]?.lastSeq, 4);
    });

    it('um número alto informado não move o início do ano (sem GREATEST)', async () => {
      const repo = createDrizzleContractRepository(handle);
      const high = buildContract({ id: ID_MANUAL_A, sequentialNumber: `0300/${String(YEAR)}` });
      assert.deepEqual(await repo.save(high, []), { ok: true, value: undefined });
      assert.deepEqual(await repo.nextSequentialNumber(YEAR), {
        ok: true,
        value: `0001/${String(YEAR)}`,
      });
    });

    it('save com número já gravado por outro contrato → contract-repo-conflict (não unavailable)', async () => {
      const repo = createDrizzleContractRepository(handle);
      const number = `0777/${String(YEAR)}`;
      const winner = buildContract({ id: ID_RACE_1, sequentialNumber: number });
      const loser = buildContract({ id: ID_RACE_2, sequentialNumber: number });
      assert.deepEqual(await repo.save(winner, []), { ok: true, value: undefined });
      assert.deepEqual(await repo.save(loser, []), { ok: false, error: 'contract-repo-conflict' });
    });
  });
}
