/**
 * CTR-HTTP-CONTRACT-LIST-FILTERS — W0 (RED) — listPaged no SQL (Drizzle/MySQL).
 *
 * Prova CA6: a filtragem/paginação roda NO BANCO (WHERE/LIKE/ORDER BY/LIMIT/OFFSET +
 * COUNT), não em memória. Gated por `MYSQL_INTEGRATION=1` (skipa sem Docker — sem
 * ERR_MODULE_NOT_FOUND porque os imports resolvem). Adicionado ao script
 * `pnpm run test:integration` para não ficar órfão.
 *
 * DEVE FALHAR (mesmo gated, ao rodar com Docker) enquanto `listPaged` não existir no
 * adapter Drizzle. Sem Docker: todos os `it` viram skip.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';

import { buildContract, buildExpiredContract } from './fixtures.ts';

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';
const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

let handle: MysqlHandle | null = null;

const truncate = async (h: MysqlHandle): Promise<void> => {
  const { db, schema } = h;
  await db.delete(schema.contractHomologatedAmendments);
  await db.delete(schema.amendments);
  await db.delete(schema.contracts);
};

if (integrationEnabled()) {
  before(async () => {
    const r = await openMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  describe('listPaged (Drizzle/MySQL) — CTR-HTTP-CONTRACT-LIST-FILTERS', () => {
    beforeEach(async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      await truncate(handle);
      const repo = createDrizzleContractRepository(handle);
      await repo.save(
        buildContract({
          id: 'a1111111-1111-4111-8111-111111111111',
          sequentialNumber: '001/2026',
          title: 'Limpeza predial',
          objective: 'Serviço',
        }),
        [],
      );
      await repo.save(
        buildContract({
          id: 'b2222222-2222-4222-8222-222222222222',
          sequentialNumber: '002/2026',
          title: 'Manutenção',
          objective: 'Reparos',
        }),
        [],
      );
      await repo.save(
        buildContract({
          id: 'c3333333-3333-4333-8333-333333333333',
          sequentialNumber: '003/2026',
          title: 'Consultoria',
          objective: 'Auditoria',
        }),
        [],
      );
      await repo.save(
        buildExpiredContract({
          id: 'd4444444-4444-4444-8444-444444444444',
          sequentialNumber: '004/2026',
          title: 'Obra',
        }),
        [],
      );
    });

    it('CA6: LIMIT/OFFSET no SQL — page 1 limit 2 traz 2 e total 4', async () => {
      if (handle === null) return;
      const repo = createDrizzleContractRepository(handle);
      const r = await repo.listPaged({ page: 1, limit: 2, order: 'ASC' });
      assert.ok(r.ok, `listPaged falhou: ${!r.ok ? JSON.stringify(r.error) : ''}`);
      if (!r.ok) return;
      assert.equal(r.value.items.length, 2);
      assert.equal(r.value.total, 4);
    });

    it('CA6: WHERE/LIKE no SQL — search filtra por title', async () => {
      if (handle === null) return;
      const repo = createDrizzleContractRepository(handle);
      const r = await repo.listPaged({ page: 1, limit: 50, order: 'ASC', search: 'limpeza' });
      assert.ok(r.ok);
      if (!r.ok) return;
      assert.equal(r.value.total, 1);
      assert.equal(r.value.items[0]?.sequentialNumber, '001/2026');
    });

    it('CA6: WHERE status no SQL', async () => {
      if (handle === null) return;
      const repo = createDrizzleContractRepository(handle);
      const r = await repo.listPaged({ page: 1, limit: 50, order: 'ASC', status: 'Expired' });
      assert.ok(r.ok);
      if (!r.ok) return;
      assert.equal(r.value.total, 1);
      assert.equal(r.value.items[0]?.status, 'Expired');
    });

    it('CA4: ORDER BY DESC no SQL', async () => {
      if (handle === null) return;
      const repo = createDrizzleContractRepository(handle);
      const r = await repo.listPaged({ page: 1, limit: 50, order: 'DESC' });
      assert.ok(r.ok);
      if (!r.ok) return;
      assert.equal(r.value.items[0]?.sequentialNumber, '004/2026');
    });
  });
} else {
  describe('listPaged (Drizzle/MySQL) — CTR-HTTP-CONTRACT-LIST-FILTERS', () => {
    it('skip: MYSQL_INTEGRATION≠1 (sem Docker)', (t) => {
      t.skip('MYSQL_INTEGRATION≠1');
    });
  });
}
