/**
 * Integração (#1024, #1071) — número do contrato informável: o que só o MySQL prova.
 *
 *   1. `nextSequentialNumber` PULA números informados à mão (nas duas grafias, `0050` e `050`) e
 *      grava o contador no número entregue — sem levar o contador ao maior informado.
 *   2. Corrida: o `save` que viola o `UNIQUE(sequential_number)` devolve `contract-repo-conflict`
 *      (o use case o traduz em 409), não `contract-repo-unavailable` (503). Com o erro REAL do
 *      mysql2, o que exercita a leitura do nome do índice na `sqlMessage` (#1071 CA2).
 *   3. #1071 CA3: número GERADO tomado por um digitado concorrente → o use case gera o próximo.
 *   4. #1071 CA4: 400 números à frente do contador → a lacuna sai de UM `SELECT` em `ctr_contracts`.
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `contracts`).
 *
 * Contrato de isolamento (testing.md): o arquivo é dono dos anos 2097 e 2098 — limpa na ENTRADA e na
 * SAÍDA todo contrato com número desses anos (qualquer id, o que pega resíduo que colidiria no
 * `UNIQUE(sequential_number)`), a outbox deles e o contador dos dois anos; não trunca tabela.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { createPool } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { inArray, like, or } from 'drizzle-orm';

import {
  buildPoolOptions,
  openMysql,
} from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import * as contractsSchema from '#src/modules/contracts/adapters/persistence/schemas/mysql.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import { contractToInsert } from '#src/modules/contracts/adapters/persistence/mappers/contract.mapper.ts';
import { formatSequentialNumber } from '#src/modules/contracts/domain/contract/sequential-number.ts';
import type { ContractRepository } from '#src/modules/contracts/domain/contract/repository.ts';
import { createPendingContract } from '#src/modules/contracts/application/use-cases/create-pending-contract.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';
import { buildContract } from './fixtures.ts';

if (process.env['MYSQL_INTEGRATION'] !== '1') {
  process.stdout.write(
    '[contracts:sequential-number-informed] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString = process.env['CONTRACTS_DATABASE_URL'] ?? mysqlTestConnectionString();
  const YEAR = 2098;
  const GAP_YEAR = 2097;
  const ID_MANUAL_A = 'e1024000-0000-4000-8000-00000000000a';
  const ID_MANUAL_B = 'e1024000-0000-4000-8000-00000000000b';
  const ID_RACE_1 = 'e1024000-0000-4000-8000-00000000000c';
  const ID_RACE_2 = 'e1024000-0000-4000-8000-00000000000d';
  const IDS = [ID_MANUAL_A, ID_MANUAL_B, ID_RACE_1, ID_RACE_2];
  const gapId = (i: number): string => `e1071000-0000-4000-8000-${String(i).padStart(12, '0')}`;

  describe('#1024/#1071 — Drizzle + MySQL: número informado × gerador × UNIQUE', () => {
    let handle: MysqlHandle;

    const cleanup = async (): Promise<void> => {
      const { db, schema } = handle;
      const owned = await db
        .select({ id: schema.contracts.id })
        .from(schema.contracts)
        .where(
          or(
            inArray(schema.contracts.id, IDS),
            like(schema.contracts.sequentialNumber, `%/${String(YEAR)}`),
            like(schema.contracts.sequentialNumber, `%/${String(GAP_YEAR)}`),
          ),
        );
      const ids = owned.map((r) => r.id);
      if (ids.length > 0) {
        await db.delete(schema.ctrOutbox).where(inArray(schema.ctrOutbox.aggregateId, ids));
        await db.delete(schema.contracts).where(inArray(schema.contracts.id, ids));
      }
      await db
        .delete(schema.ctrContractSeq)
        .where(inArray(schema.ctrContractSeq.year, [YEAR, GAP_YEAR]));
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
        .where(inArray(schema.ctrContractSeq.year, [YEAR]));
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

    it('#1071 CA3: o gerado é tomado por um digitado concorrente → grava com o próximo', async () => {
      const repo = createDrizzleContractRepository(handle);
      let stolen = false;
      const raced: ContractRepository = {
        ...repo,
        nextSequentialNumber: async (year) => {
          const r = await repo.nextSequentialNumber(year);
          if (r.ok && !stolen) {
            stolen = true;
            const thief = buildContract({ id: ID_RACE_1, sequentialNumber: r.value });
            assert.deepEqual(await repo.save(thief, []), { ok: true, value: undefined });
          }
          return r;
        },
      };
      const clock = ClockFixed(new Date(`${String(YEAR)}-03-15T12:00:00.000Z`));
      const r = await createPendingContract({ contractRepo: raced, clock })({
        title: 'Contrato pendente',
        objective: 'Objetivo',
        originalValueCents: 10_000_000,
        periodStart: `${String(YEAR)}-03-15`,
        periodEnd: `${String(YEAR)}-12-31`,
        contractorType: 'supplier',
        contractorId: '55555555-5555-4555-8555-555555555555',
      });
      assert.equal(r.ok ? r.value.contract.sequentialNumber : r.error, `0002/${String(YEAR)}`);
    });

    it('#1071 CA4: 400 digitados à frente do contador → a lacuna sai de UM SELECT', async () => {
      const rows = Array.from(
        { length: 400 },
        (_, i) =>
          contractToInsert(
            buildContract({
              id: gapId(i),
              sequentialNumber: formatSequentialNumber(i + 1, GAP_YEAR),
            }),
          ).row,
      );
      await handle.db.insert(handle.schema.contracts).values(rows);

      const cfg = buildPoolOptions({ connectionString });
      if (!cfg.ok) throw new Error(`fixture: pool inválido — ${cfg.error}`);
      const pool = createPool(cfg.value);
      const queries: string[] = [];
      const counting: MysqlHandle = {
        db: drizzle(pool, {
          schema: contractsSchema,
          mode: 'default',
          logger: {
            logQuery: (query) => {
              queries.push(query);
            },
          },
        }),
        schema: contractsSchema,
        close: async () => {
          await pool.end();
        },
      };
      try {
        const r = await createDrizzleContractRepository(counting).nextSequentialNumber(GAP_YEAR);
        assert.deepEqual(r, { ok: true, value: `0401/${String(GAP_YEAR)}` });
        const onContracts = queries.filter((q) => /from `ctr_contracts`/i.test(q));
        assert.equal(onContracts.length, 1, `queries em ctr_contracts: ${onContracts.join(' | ')}`);
      } finally {
        await counting.close();
      }
    });
  });
}
