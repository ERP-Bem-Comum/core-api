/**
 * CTR-DB-DRIVER-MYSQL — W0 (RED) — repo level + CLI integration
 *
 * Cobre CA-3, CA-4 (exports), CA-9, CA-10 (suites contratuais),
 * CA-11 (UNIQUE constraint), CA-12 (transação atômica),
 * (CA-13/14 — lifecycle do buildMysqlContext da CLI — removidos com a CLI; CLI-RETIRE-EMBEDDED.)
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
import { buildContract, buildCancelledContract } from './fixtures.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import { runContractRepositoryContract } from './contract-repository.suite.ts';
import { runAmendmentRepositoryContract } from './amendment-repository.suite.ts';

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

const unwrapId = (raw: string): ContractId.ContractId => {
  const r = ContractId.rehydrate(raw);
  if (!r.ok) throw new Error(`bad contract id fixture: ${r.error}`);
  return r.value;
};

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
  // CTR-CONTRACT-SEQUENTIAL-NUMBER / CTR-AMENDMENT-SIGNEDAT-AND-NUMBER: reseta os contadores
  // (por ano / por contrato) para determinismo (sem FK; ordem livre).
  await db.delete(schema.ctrContractSeq);
  await db.delete(schema.ctrAmendmentSeq);
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
            contractorType: 'supplier',
            contractorId: '55555555-5555-4555-8555-555555555555',
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

    // CTR-CONTRACT-SEQUENTIAL-NUMBER — CA-2: numeração gerada transacionalmente
    // (ctr_contract_seq + FOR UPDATE) é única e crescente por ano, e reinicia no ano novo.
    it('nextSequentialNumber: monotônico por ano e reinicia no ano seguinte', async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      const repo = createDrizzleContractRepository(handle);

      const a = await repo.nextSequentialNumber(2026);
      const b = await repo.nextSequentialNumber(2026);
      const c = await repo.nextSequentialNumber(2027);
      assert.ok(a.ok && b.ok && c.ok, 'nextSequentialNumber não deveria falhar');
      if (!a.ok || !b.ok || !c.ok) return;
      assert.equal(a.value, '0001/2026');
      assert.equal(b.value, '0002/2026');
      assert.equal(c.value, '0001/2027');
    });

    // CTR-HTTP-CANCEL-PENDING (ADR-0039): round-trip do estado Cancelled contra MySQL real.
    // Exercita a migration 0011 (3 CHECKs revisados) + o mapper: o INSERT (ended_at NOT NULL +
    // vigência NULL) deve PASSAR nos CHECKs `pending_consistency` e `ended_at_consistency`.
    it('Cancelled: save + findById round-trip (CHECKs + mapper)', async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      const repo = createDrizzleContractRepository(handle);
      const cancelled = buildCancelledContract({
        id: 'dddddddd-4444-4444-8444-dddddddddddd',
        sequentialNumber: '950/2026',
        endedAtISO: '2026-03-20T12:00:00.000Z',
      });
      const saved = await repo.save(cancelled, []);
      assert.ok(saved.ok, `save Cancelled falhou: ${!saved.ok ? JSON.stringify(saved.error) : ''}`);

      const loaded = await repo.findById(cancelled.id);
      assert.ok(loaded.ok && loaded.value !== null, 'findById deveria achar o cancelado');
      if (!loaded.ok || loaded.value === null) return;
      assert.equal(loaded.value.status, 'Cancelled');
      if (loaded.value.status === 'Cancelled') {
        assert.equal(
          loaded.value.endedAt.getTime(),
          new Date('2026-03-20T12:00:00.000Z').getTime(),
        );
      }
    });

    // CTR-AMENDMENT-SIGNEDAT-AND-NUMBER (G3): número do aditivo gerado transacionalmente
    // (ctr_amendment_seq + FOR UPDATE) é único e crescente POR CONTRATO; outro contrato reinicia.
    it('nextAmendmentNumber: monotônico por contrato; outro contrato reinicia', async () => {
      if (handle === null) throw new Error('fixture: handle MySQL não inicializado');
      const repo = createDrizzleAmendmentRepository(handle);
      const cidA = unwrapId('eeeeeeee-5555-4555-8555-eeeeeeeeeeee');
      const cidB = unwrapId('ffffffff-6666-4666-8666-ffffffffffff');

      const a1 = await repo.nextAmendmentNumber(cidA, 2026);
      const a2 = await repo.nextAmendmentNumber(cidA, 2026);
      const b1 = await repo.nextAmendmentNumber(cidB, 2026);
      assert.ok(a1.ok && a2.ok && b1.ok, 'nextAmendmentNumber não deveria falhar');
      if (!a1.ok || !a2.ok || !b1.ok) return;
      assert.equal(a1.value, '01/2026');
      assert.equal(a2.value, '02/2026');
      assert.equal(b1.value, '01/2026');
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
