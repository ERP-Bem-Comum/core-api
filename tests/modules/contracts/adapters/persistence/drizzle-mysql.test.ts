/**
 * CTR-DB-DRIVER-MYSQL — W0 (RED) — repo level + CLI integration
 *
 * Cobre CA-3, CA-4 (exports), CA-9, CA-10 (suites contratuais),
 * CA-11 (UNIQUE constraint), CA-12 (transação atômica),
 * CA-13, CA-14 (CLI buildMysqlContext lifecycle).
 *
 * Todas as asserções funcionais usam opt-in `MYSQL_INTEGRATION=1` (padrão #3).
 * Estruturais (CA-3, CA-4) falham no W0 por erro de import enquanto
 * `repos/{contract,amendment}-repository.drizzle-mysql.ts` não existirem.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import { createDrizzleAmendmentRepository } from '#src/modules/contracts/adapters/persistence/repos/amendment-repository.drizzle.ts';
import { buildMysqlContext } from '#src/modules/contracts/cli/drivers/mysql.ts';
import { buildContract } from './fixtures.ts';
import { runContractRepositoryContract } from './contract-repository.suite.ts';
import { runAmendmentRepositoryContract } from './amendment-repository.suite.ts';

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

// ─── Helper: handle compartilhado entre tests (1 pool) + truncate per-test ──
// Abrir/fechar pool por teste fica caro. Mantemos 1 handle por arquivo de
// suite e limpamos as tabelas antes de cada `make()` retornar.
const TABLES_IN_FK_ORDER: readonly string[] = [
  'ctr_contract_homologated_amendments',
  'ctr_amendments',
  'ctr_contracts',
];

const truncateAll = async (handle: MysqlHandle): Promise<void> => {
  // DELETE em ordem que respeita FK (filhas → pai). TRUNCATE é mais rápido mas
  // requer SUPER em algumas instalações + reseta AUTO_INCREMENT (irrelevante
  // aqui — sem AUTO_INCREMENT). DELETE FROM é seguro e suficiente.
  const { db, schema } = handle;
  await db.delete(schema.contractHomologatedAmendments);
  await db.delete(schema.amendments);
  await db.delete(schema.contracts);
  // (silencia o TABLES_IN_FK_ORDER — fica como documentação inline)
  void TABLES_IN_FK_ORDER;
};

// ─── CA-3 / CA-4 — Exports dos repos (estrutural via import) ──────────────
describe('CTR-DB-DRIVER-MYSQL — CA-3/4: shape dos repos drizzle-mysql', () => {
  it('CA-3: createDrizzleContractRepository é uma função', () => {
    assert.equal(typeof createDrizzleContractRepository, 'function');
  });

  it('CA-4: createDrizzleAmendmentRepository é uma função', () => {
    assert.equal(typeof createDrizzleAmendmentRepository, 'function');
  });
});

// ─── CA-9..12 — Suite contratual + constraints específicas ────────────────
// Usa o mesmo padrão de `drizzle-sqlite.test.ts`: cada `make()` do factory
// abre um repo "fresh-looking" (truncado), reutilizando handle persistente.
if (integrationEnabled()) {
  // Sentinel `let handle` setado no top-level before; visível nas factories.
  let handle: MysqlHandle | null = null;

  before(async () => {
    const r = await openMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) {
      throw new Error(`fixture: openMysql falhou — ${r.error}`);
    }
    handle = r.value;
  });

  // CRÍTICO: sem este `after`, o pool mysql2 (com `enableKeepAlive: true`)
  // mantém conexões TCP vivas e o processo node nunca termina — node:test
  // não força exit enquanto houver handles I/O ativos.
  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  // CA-9 — Suite contratual de ContractRepository.
  runContractRepositoryContract('Drizzle/MySQL (truncated)', {
    make: async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      await truncateAll(handle);
      return { repo: createDrizzleContractRepository(handle) };
    },
  });

  // CA-10 — Suite contratual de AmendmentRepository.
  runAmendmentRepositoryContract('Drizzle/MySQL (truncated)', {
    make: async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      await truncateAll(handle);
      const { db, schema } = handle;
      return {
        repo: createDrizzleAmendmentRepository(handle),
        seedContract: async (contractId: string) => {
          // Row mínima — campos extras placeholders, igual ao test SQLite.
          await db.insert(schema.contracts).values({
            id: contractId,
            sequentialNumber: `seed-${contractId.slice(0, 8)}`,
            title: 'seed',
            objective: 'seed',
            signedAt: new Date('2026-01-01'),
            originalValueCents: 1000,
            originalPeriodKind: 'Fixed',
            originalPeriodStart: new Date('2026-01-01'),
            originalPeriodEnd: new Date('2026-12-31'),
            currentValueCents: 1000,
            currentPeriodKind: 'Fixed',
            currentPeriodStart: new Date('2026-01-01'),
            currentPeriodEnd: new Date('2026-12-31'),
            status: 'Active',
            endedAt: null,
          });
        },
      };
    },
  });

  // CA-11 e CA-12 — constraints específicas do MySQL real.
  describe('CTR-DB-DRIVER-MYSQL — CA-11/12: constraints reais', () => {
    beforeEach(async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      await truncateAll(handle);
    });

    it('CA-11: UNIQUE em sequential_number rejeita conflito real', async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      const repo = createDrizzleContractRepository(handle);
      const c1 = buildContract({
        id: 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa',
        sequentialNumber: '999/2026',
      });
      const c2 = buildContract({
        id: 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb',
        sequentialNumber: '999/2026', // mesmo número, id diferente — deve falhar
      });
      const r1 = await repo.save(c1, []);
      assert.ok(r1.ok, `1º save falhou: ${!r1.ok ? JSON.stringify(r1.error) : ''}`);
      const r2 = await repo.save(c2, []);
      assert.equal(r2.ok, false, '2º save com mesmo sequentialNumber deveria falhar');
    });

    it('CA-12: save atualizando contrato existente (upsert por id) preserva integridade', async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      const repo = createDrizzleContractRepository(handle);
      const c1 = buildContract({
        id: 'cccccccc-3333-4333-8333-cccccccccccc',
        sequentialNumber: '888/2026',
        title: 'original',
      });
      const r1 = await repo.save(c1, []);
      assert.ok(r1.ok, `1º save falhou: ${!r1.ok ? JSON.stringify(r1.error) : ''}`);

      const c2 = buildContract({
        id: 'cccccccc-3333-4333-8333-cccccccccccc', // mesmo id
        sequentialNumber: '888/2026',
        title: 'atualizado', // mudou
      });
      const r2 = await repo.save(c2, []);
      assert.ok(r2.ok, `2º save (upsert) falhou: ${!r2.ok ? JSON.stringify(r2.error) : ''}`);

      // Verifica que o título foi atualizado (upsert atualizou a row existente)
      const idR = await repo.findById(c1.id);
      assert.ok(idR.ok && idR.value !== null);
      if (!idR.ok || idR.value === null) return;
      assert.equal(idR.value.title, 'atualizado', 'upsert por id deveria ter atualizado o título');
    });
  });
}

// ─── CA-13/14 — CLI buildMysqlContext lifecycle ───────────────────────────
describe('CTR-DB-DRIVER-MYSQL — CA-13/14: buildMysqlContext', () => {
  it('CA-13: buildMysqlContext contra container válido retorna ok(ctx)', async (t) => {
    if (!integrationEnabled()) {
      t.skip('MYSQL_INTEGRATION≠1');
      return;
    }
    const r = await buildMysqlContext(VALID_CONN);
    assert.ok(r.ok, `buildMysqlContext falhou: ${!r.ok ? r.error : ''}`);
    if (!r.ok) return;
    const ctx = r.value;
    assert.ok(ctx.contractRepo, 'ctx.contractRepo ausente');
    assert.ok(ctx.amendmentRepo, 'ctx.amendmentRepo ausente');
    // CA-6: eventBus removido do CliContext (CTR-OUTBOX-INTEGRATION-IN-REPOS)
    assert.ok(ctx.clock, 'ctx.clock ausente');
    assert.equal(typeof ctx.persist, 'function', 'ctx.persist deveria ser função');
    assert.equal(typeof ctx.shutdown, 'function', 'ctx.shutdown deveria ser função');
    await ctx.shutdown();
  });

  it('CA-14: ctx.shutdown() fecha pool sem erro', async (t) => {
    if (!integrationEnabled()) {
      t.skip('MYSQL_INTEGRATION≠1');
      return;
    }
    const r = await buildMysqlContext(VALID_CONN);
    assert.ok(r.ok);
    if (!r.ok) return;
    // shutdown deve completar sem throw
    await r.value.shutdown();
    // Não há "is pool open" público; confirmação implícita: shutdown subsequente
    // deveria ser idempotente OU dar erro previsível. Aceitamos qualquer um.
    try {
      await r.value.shutdown();
    } catch {
      // OK — pool já fechado pode lançar; não é falha do teste.
    }
  });
});
