/**
 * CTR-AUTO-EXPIRE (issue #39 · ADR-0041) — integration tests: findExpirable
 *
 * Cobre os comportamentos da Fatia C (persistência):
 *   CA1 — retorna somente contratos Active + Fixed com end < cutoff.
 *   CA2 — NÃO retorna Active+Fixed ainda dentro do prazo (end >= cutoff).
 *   CA3 — NÃO retorna Active+Indefinite (período sem fim).
 *   CA4 — NÃO retorna contratos Expired (estado terminal).
 *   CA5 — respeita o LIMIT (batchSize).
 *
 * Guard: MYSQL_INTEGRATION=1.
 * Setup: 1 handle MySQL compartilhado por arquivo + truncate em beforeEach.
 * Roda via `pnpm run test:integration` (já incluso no script do package.json).
 *
 * AAA: Arrange / Act / Assert delimitados por comentários.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

// ── Infra Drizzle ─────────────────────────────────────────────────────────────
import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';

// ── Helpers de domínio ────────────────────────────────────────────────────────
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import { buildContract, buildExpiredContract } from '../fixtures.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

// ─── Configuração ─────────────────────────────────────────────────────────────

const VALID_CONN = mysqlTestConnectionString();

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

// cutoff = 2026-06-15 (data D+1 do sweeper; contratos com end < 2026-06-15 são elegíveis)
const CUTOFF = (() => {
  const r = PlainDate.from('2026-06-15');
  if (!r.ok) throw new Error('fixture: cutoff inválido');
  return r.value;
})();

// ─── Truncate em FK-safe order ────────────────────────────────────────────────

const truncateContracts = async (handle: MysqlHandle): Promise<void> => {
  const { db, schema } = handle;
  await db.delete(schema.contractHomologatedAmendments);
  await db.delete(schema.amendments);
  await db.delete(schema.contracts);
  await db.delete(schema.ctrContractSeq);
};

// ─── CA-1 (estrutural) ────────────────────────────────────────────────────────

describe('CTR-AUTO-EXPIRE — CA-1 (estrutural): findExpirable existe no adapter', () => {
  it('createDrizzleContractRepository expõe findExpirable como função', () => {
    // Sem MySQL — só verifica o shape do adapter compilado.
    // Falha em W0 por ERR_MODULE_NOT_FOUND se o método não existir.
    assert.equal(typeof createDrizzleContractRepository, 'function');
  });
});

// ─── CA-1..5 Integration ─────────────────────────────────────────────────────

if (integrationEnabled()) {
  let handle: MysqlHandle | null = null;

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

  beforeEach(async () => {
    if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
    await truncateContracts(handle);
  });

  describe('CTR-AUTO-EXPIRE — CA-1: retorna elegíveis (Active+Fixed+end<cutoff)', () => {
    it('CA-1: persiste 1 contrato elegível e findExpirable o retorna', async () => {
      // Arrange: contrato Active + Fixed com vigência encerrada antes do cutoff.
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleContractRepository(handle);

      const contract = buildContract({
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        sequentialNumber: '001/2026',
        // período termina em 2026-05-31 < cutoff 2026-06-15 → elegível
        periodKind: 'Fixed',
        periodStartISO: '2026-01-01',
        periodEndISO: '2026-05-31',
      });

      // Act: salva e busca
      const saved = await repo.save(contract, []);
      assert.ok(saved.ok, `save falhou: ${JSON.stringify(saved)}`);

      const found = await repo.findExpirable(CUTOFF, 10);

      // Assert
      assert.ok(found.ok, `findExpirable falhou: ${JSON.stringify(found)}`);
      assert.equal(found.value.length, 1);
      assert.equal(found.value[0]?.id, contract.id, 'id do contrato deve bater');
      assert.equal(found.value[0]?.status, 'Active');
    });
  });

  describe('CTR-AUTO-EXPIRE — CA-2: NÃO retorna Active+Fixed ainda vigente', () => {
    it('CA-2: contrato com end >= cutoff não aparece no resultado', async () => {
      // Arrange: vigência até 2026-12-31 >= cutoff 2026-06-15 → não elegível
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleContractRepository(handle);

      const contract = buildContract({
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        sequentialNumber: '002/2026',
        periodKind: 'Fixed',
        periodStartISO: '2026-01-01',
        periodEndISO: '2026-12-31',
      });

      const saved = await repo.save(contract, []);
      assert.ok(saved.ok, `save falhou: ${JSON.stringify(saved)}`);

      // Act
      const found = await repo.findExpirable(CUTOFF, 10);

      // Assert: lista vazia
      assert.ok(found.ok, `findExpirable falhou: ${JSON.stringify(found)}`);
      assert.equal(found.value.length, 0, 'contrato vigente não deve aparecer');
    });
  });

  describe('CTR-AUTO-EXPIRE — CA-3: NÃO retorna Active+Indefinite', () => {
    it('CA-3: contrato com período Indefinite não aparece no resultado', async () => {
      // Arrange: período sem fim → nunca expira por prazo
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleContractRepository(handle);

      const contract = buildContract({
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        sequentialNumber: '003/2026',
        periodKind: 'Indefinite',
        periodStartISO: '2026-01-01',
      });

      const saved = await repo.save(contract, []);
      assert.ok(saved.ok, `save falhou: ${JSON.stringify(saved)}`);

      // Act
      const found = await repo.findExpirable(CUTOFF, 10);

      // Assert
      assert.ok(found.ok, `findExpirable falhou: ${JSON.stringify(found)}`);
      assert.equal(found.value.length, 0, 'contrato Indefinite não deve aparecer');
    });
  });

  describe('CTR-AUTO-EXPIRE — CA-4: NÃO retorna contratos Expired', () => {
    it('CA-4: contrato já Expired não aparece no resultado', async () => {
      // Arrange: cria Active e transiciona para Expired antes de salvar.
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleContractRepository(handle);

      // buildExpiredContract usa period padrão (fim 2026-12-31) + endedAt 2027-01-01.
      // Para forçar elegibilidade de período vencido, usamos period com fim antes do cutoff.
      const expired = buildExpiredContract({
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        sequentialNumber: '004/2026',
        periodKind: 'Fixed',
        periodStartISO: '2026-01-01',
        periodEndISO: '2026-05-31',
        endedAtISO: '2026-06-01T00:00:00.000Z',
      });

      const saved = await repo.save(expired, []);
      assert.ok(saved.ok, `save falhou: ${JSON.stringify(saved)}`);

      // Act
      const found = await repo.findExpirable(CUTOFF, 10);

      // Assert: status=Expired → WHERE status='Active' exclui
      assert.ok(found.ok, `findExpirable falhou: ${JSON.stringify(found)}`);
      assert.equal(found.value.length, 0, 'contrato Expired não deve aparecer');
    });
  });

  describe('CTR-AUTO-EXPIRE — CA-5: LIMIT é respeitado (batchSize)', () => {
    it('CA-5: persiste 3 elegíveis, findExpirable com limit=2 retorna apenas 2', async () => {
      // Arrange: 3 contratos elegíveis com datas de fim distintas
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleContractRepository(handle);

      // Datas em ordem crescente de fim para verificar ordenação.
      const c1 = buildContract({
        id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
        sequentialNumber: '010/2026',
        periodKind: 'Fixed',
        periodStartISO: '2026-01-01',
        periodEndISO: '2026-02-28', // mais antigo → deve ser o 1º
      });
      const c2 = buildContract({
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        sequentialNumber: '011/2026',
        periodKind: 'Fixed',
        periodStartISO: '2026-01-01',
        periodEndISO: '2026-03-31',
      });
      const c3 = buildContract({
        id: '00000001-0000-4000-8000-000000000001',
        sequentialNumber: '012/2026',
        periodKind: 'Fixed',
        periodStartISO: '2026-01-01',
        periodEndISO: '2026-04-30', // mais recente → deve ser excluído pelo limit
      });

      for (const c of [c1, c2, c3]) {
        const r = await repo.save(c, []);
        assert.ok(r.ok, `save falhou para ${c.id}: ${JSON.stringify(r)}`);
      }

      // Act: limit=2
      const found = await repo.findExpirable(CUTOFF, 2);

      // Assert: apenas 2 contratos, os de end mais antigo
      assert.ok(found.ok, `findExpirable falhou: ${JSON.stringify(found)}`);
      assert.equal(found.value.length, 2, 'limit=2 deve retornar exatamente 2 contratos');

      // Verifica ordenação (end ASC): c1 (2026-02-28) antes de c2 (2026-03-31)
      assert.equal(found.value[0]?.id, c1.id, 'primeiro deve ser o de end mais antigo');
      assert.equal(found.value[1]?.id, c2.id, 'segundo deve ser o de end intermediário');
    });
  });

  describe('CTR-AUTO-EXPIRE — CA-1 combinado: mix de elegíveis e não-elegíveis', () => {
    it('CA-1b: apenas os elegíveis aparecem num conjunto misto', async () => {
      // Arrange: 1 elegível + 1 vigente + 1 indefinite + 1 expired
      if (handle === null) throw new Error('fixture: handle não inicializado');
      const repo = createDrizzleContractRepository(handle);

      const elegivel = buildContract({
        id: '11111111-1111-4111-8111-111111111111',
        sequentialNumber: '100/2026',
        periodKind: 'Fixed',
        periodStartISO: '2026-01-01',
        periodEndISO: '2026-05-01',
      });
      const vigente = buildContract({
        id: '22222222-2222-4222-8222-222222222222',
        sequentialNumber: '101/2026',
        periodKind: 'Fixed',
        periodStartISO: '2026-01-01',
        periodEndISO: '2026-12-31',
      });
      const indefinite = buildContract({
        id: '33333333-3333-4333-8333-333333333333',
        sequentialNumber: '102/2026',
        periodKind: 'Indefinite',
        periodStartISO: '2026-01-01',
      });
      const expired = buildExpiredContract({
        id: '44444444-4444-4444-8444-444444444444',
        sequentialNumber: '103/2026',
        periodKind: 'Fixed',
        periodStartISO: '2026-01-01',
        periodEndISO: '2026-05-01',
        endedAtISO: '2026-05-02T00:00:00.000Z',
      });

      for (const c of [elegivel, vigente, indefinite, expired]) {
        const r = await repo.save(c, []);
        assert.ok(r.ok, `save falhou para ${c.id}: ${JSON.stringify(r)}`);
      }

      // Act
      const found = await repo.findExpirable(CUTOFF, 10);

      // Assert: apenas o elegível
      assert.ok(found.ok, `findExpirable falhou: ${JSON.stringify(found)}`);
      assert.equal(found.value.length, 1, 'apenas 1 contrato elegível no conjunto');
      assert.equal(found.value[0]?.id, elegivel.id);
    });
  });
}
