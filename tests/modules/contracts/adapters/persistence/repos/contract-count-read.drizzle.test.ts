/**
 * 010-partner-contract-counts — integração Drizzle/MySQL do ContractCountReadPort.
 *
 * Gated por `MYSQL_INTEGRATION=1` (skip limpo sem Docker). Sobe o handle de
 * contracts (openMysql + applyMigrations), semeia contratos e aditivos via inserts
 * diretos no schema, e prova:
 *
 *   CA-1: countByContractor agrupa contratos+aditivos por contratado em lote.
 *   CA-2: id sem contrato → { contracts: 0, amendments: 0 } (zero preenchido pelo adapter).
 *   CA-3: sem vazamento entre contractor_type (supplier vs collaborator vs financier vs act).
 *   CA-4: ids vazio → Map vazia, SEM emitir SQL IN () inválido.
 *   CA-5: contractorIdsWithContractStatus retorna só os contratados com o status dado.
 *   CA-6: contractorIdsWithAnyContract retorna todos os contratados com ao menos 1 contrato.
 *
 * Padrão estrutural: 1 handle compartilhado por arquivo (before/after),
 * truncate em beforeEach (FK-safe order), imports via #src/*.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';

import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractCountReadStore } from '#src/modules/contracts/adapters/persistence/repos/contract-count-read.drizzle.ts';

// ─── Configuração ─────────────────────────────────────────────────────────────

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

// ─── UUID helpers para fixtures ───────────────────────────────────────────────

// UUIDs de contratados (supplier)
const SUP_A = 'aaaa0001-0000-4000-8000-000000000001';
const SUP_B = 'aaaa0002-0000-4000-8000-000000000002';
const SUP_C = 'aaaa0003-0000-4000-8000-000000000003'; // sem contratos

// UUIDs de contratados (collaborator — para teste de isolamento de type)
const COL_A = 'bbbb0001-0000-4000-8000-000000000001';

// UUIDs de contratos
const CTR_1 = 'cccc0001-0000-4000-8000-000000000001'; // supplier A, Active
const CTR_2 = 'cccc0002-0000-4000-8000-000000000002'; // supplier A, Expired
const CTR_3 = 'cccc0003-0000-4000-8000-000000000003'; // supplier B, Active
const CTR_4 = 'cccc0004-0000-4000-8000-000000000004'; // collaborator A, Active

// UUIDs de aditivos
const AMD_1 = 'dddd0001-0000-4000-8000-000000000001'; // → CTR_1
const AMD_2 = 'dddd0002-0000-4000-8000-000000000002'; // → CTR_1
const AMD_3 = 'dddd0003-0000-4000-8000-000000000003'; // → CTR_3

// ─── Truncate (FK-safe order) ─────────────────────────────────────────────────

const truncate = async (h: MysqlHandle): Promise<void> => {
  const { db, schema } = h;
  // FK: contractHomologatedAmendments → amendments + contracts; amendments → contracts
  await db.delete(schema.contractHomologatedAmendments);
  await db.delete(schema.amendments);
  await db.delete(schema.contracts);
};

// ─── Seed helpers ─────────────────────────────────────────────────────────────

const seedContracts = async (h: MysqlHandle): Promise<void> => {
  const { db, schema } = h;
  const c = schema.contracts;
  // Valores mínimos que satisfazem os CHECKs do schema:
  //   - status IN ('Pending','Active','Expired','Terminated','Cancelled')
  //   - pending_consistency_chk: status Active => signedAt + currentValue + currentPeriodKind + currentPeriodStart NOT NULL
  //   - ended_at_consistency_chk: (endedAt IS NOT NULL) = (status IN ('Expired','Terminated','Cancelled'))
  //   - original_period_kind_chk: IN ('Fixed','Indefinite')

  const now = new Date('2026-01-15T00:00:00.000Z');
  const periodStart = new Date('2026-02-01');
  const periodEnd = new Date('2026-12-31');

  const base = {
    sequentialNumber: '',
    title: 'Contrato Count Fixture',
    objective: 'Teste de contagem',
    signedAt: now,
    originalValueCents: 100_000,
    originalPeriodKind: 'Fixed',
    originalPeriodStart: periodStart,
    originalPeriodEnd: periodEnd,
    currentValueCents: 100_000,
    currentPeriodKind: 'Fixed' as const,
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
    status: 'Active' as const,
    endedAt: null,
    contractorType: 'supplier' as const,
    contractorId: SUP_A,
    classification: 'CT' as const,
  };

  await db.insert(c).values([
    // supplier A — 2 contratos (1 Active + 1 Expired)
    {
      ...base,
      id: CTR_1,
      sequentialNumber: '001/2026',
      contractorId: SUP_A,
      status: 'Active',
    },
    {
      ...base,
      id: CTR_2,
      sequentialNumber: '002/2026',
      contractorId: SUP_A,
      status: 'Expired',
      endedAt: new Date('2027-01-01T00:00:00.000Z'),
    },
    // supplier B — 1 contrato
    {
      ...base,
      id: CTR_3,
      sequentialNumber: '003/2026',
      contractorId: SUP_B,
      status: 'Active',
    },
    // collaborator A — 1 contrato (tipo diferente, para teste de isolamento)
    {
      ...base,
      id: CTR_4,
      sequentialNumber: '004/2026',
      contractorId: COL_A,
      contractorType: 'collaborator',
      status: 'Active',
    },
  ]);
};

const seedAmendments = async (h: MysqlHandle): Promise<void> => {
  const { db, schema } = h;
  const a = schema.amendments;

  const now = new Date('2026-03-01T00:00:00.000Z');

  await db.insert(a).values([
    // CTR_1 (supplier A) tem 2 aditivos
    {
      id: AMD_1,
      contractId: CTR_1,
      amendmentNumber: 'AD 01-001/2026',
      description: 'Aditivo fixture',
      createdAt: now,
      kind: 'Misc' as const,
      status: 'Pending' as const,
    },
    {
      id: AMD_2,
      contractId: CTR_1,
      amendmentNumber: 'AD 02-001/2026',
      description: 'Aditivo fixture 2',
      createdAt: now,
      kind: 'Misc' as const,
      status: 'Pending' as const,
    },
    // CTR_3 (supplier B) tem 1 aditivo
    {
      id: AMD_3,
      contractId: CTR_3,
      amendmentNumber: 'AD 01-003/2026',
      description: 'Aditivo fixture supplier B',
      createdAt: now,
      kind: 'Misc' as const,
      status: 'Pending' as const,
    },
  ]);
};

// ─── Guard: MYSQL_INTEGRATION=1 ───────────────────────────────────────────────

if (!integrationEnabled()) {
  describe('contract-count-read.drizzle (Drizzle/MySQL) — 010-partner-contract-counts', () => {
    it('skip: MYSQL_INTEGRATION≠1 (sem Docker)', (t) => {
      t.skip('MYSQL_INTEGRATION≠1');
    });
  });
} else {
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
    await truncate(handle);
    await seedContracts(handle);
    await seedAmendments(handle);
  });

  describe('contract-count-read.drizzle — 010-partner-contract-counts', () => {
    // ── CA-1: countByContractor agrupa contratos+aditivos em lote ──────────────

    it('CA-1: countByContractor — supplier A tem 2 contratos e 2 aditivos', async () => {
      if (handle === null) return;
      const port = createDrizzleContractCountReadStore(handle);

      const r = await port.countByContractor('supplier', [SUP_A]);
      assert.ok(r.ok, `countByContractor falhou: ${!r.ok ? r.error : ''}`);
      if (!r.ok) return;

      const count = r.value.get(SUP_A);
      assert.ok(count !== undefined, `SUP_A deve estar no resultado`);
      assert.equal(count.contracts, 2, 'SUP_A deve ter 2 contratos');
      assert.equal(count.amendments, 2, 'SUP_A deve ter 2 aditivos (ambos de CTR_1)');
    });

    it('CA-1: countByContractor — supplier B tem 1 contrato e 1 aditivo', async () => {
      if (handle === null) return;
      const port = createDrizzleContractCountReadStore(handle);

      const r = await port.countByContractor('supplier', [SUP_B]);
      assert.ok(r.ok, `countByContractor falhou: ${!r.ok ? r.error : ''}`);
      if (!r.ok) return;

      const count = r.value.get(SUP_B);
      assert.ok(count !== undefined, `SUP_B deve estar no resultado`);
      assert.equal(count.contracts, 1, 'SUP_B deve ter 1 contrato');
      assert.equal(count.amendments, 1, 'SUP_B deve ter 1 aditivo');
    });

    it('CA-1: countByContractor — lote de A+B retorna ambos corretamente', async () => {
      if (handle === null) return;
      const port = createDrizzleContractCountReadStore(handle);

      const r = await port.countByContractor('supplier', [SUP_A, SUP_B]);
      assert.ok(r.ok, `countByContractor falhou: ${!r.ok ? r.error : ''}`);
      if (!r.ok) return;

      assert.equal(r.value.size, 2, 'deve retornar 2 entradas para lote de 2 ids');

      const a = r.value.get(SUP_A);
      const b = r.value.get(SUP_B);

      assert.ok(a !== undefined);
      assert.equal(a.contracts, 2);
      assert.equal(a.amendments, 2);

      assert.ok(b !== undefined);
      assert.equal(b.contracts, 1);
      assert.equal(b.amendments, 1);
    });

    // ── CA-2: id sem contrato → {0, 0} ────────────────────────────────────────

    it('CA-2: countByContractor — id sem contrato recebe {0, 0}', async () => {
      if (handle === null) return;
      const port = createDrizzleContractCountReadStore(handle);

      // SUP_C não tem nenhum contrato semeado
      const r = await port.countByContractor('supplier', [SUP_C]);
      assert.ok(r.ok, `countByContractor falhou: ${!r.ok ? r.error : ''}`);
      if (!r.ok) return;

      // O adapter deve preencher o id ausente com zeros
      const count = r.value.get(SUP_C);
      assert.ok(count !== undefined, 'SUP_C deve estar no resultado (preenchido com zeros)');
      assert.equal(count.contracts, 0, 'SUP_C deve ter 0 contratos');
      assert.equal(count.amendments, 0, 'SUP_C deve ter 0 aditivos');
    });

    // ── CA-3: sem vazamento entre contractor_type ─────────────────────────────

    it('CA-3: sem vazamento — supplier não vê contratos de collaborator', async () => {
      if (handle === null) return;
      const port = createDrizzleContractCountReadStore(handle);

      // COL_A tem 1 contrato, mas é do tipo collaborator.
      // Quando consultamos como supplier, deve retornar 0.
      const r = await port.countByContractor('supplier', [COL_A]);
      assert.ok(r.ok, `countByContractor falhou: ${!r.ok ? r.error : ''}`);
      if (!r.ok) return;

      const count = r.value.get(COL_A);
      assert.ok(count !== undefined);
      assert.equal(
        count.contracts,
        0,
        'COL_A como supplier deve ter 0 contratos (isolamento de tipo)',
      );
      assert.equal(count.amendments, 0, 'COL_A como supplier deve ter 0 aditivos');
    });

    it('CA-3: collaborator vê seus próprios contratos sem vazamento', async () => {
      if (handle === null) return;
      const port = createDrizzleContractCountReadStore(handle);

      const r = await port.countByContractor('collaborator', [COL_A]);
      assert.ok(r.ok, `countByContractor falhou: ${!r.ok ? r.error : ''}`);
      if (!r.ok) return;

      const count = r.value.get(COL_A);
      assert.ok(count !== undefined);
      assert.equal(count.contracts, 1, 'COL_A como collaborator deve ter 1 contrato');
      assert.equal(count.amendments, 0, 'COL_A não tem aditivos');
    });

    // ── CA-4: ids vazio → Map vazia, sem SQL IN () ────────────────────────────

    it('CA-4: ids vazio → Map vazia sem emitir SQL IN () inválido', async () => {
      if (handle === null) return;
      const port = createDrizzleContractCountReadStore(handle);

      // Não deve lançar nem retornar erro; deve retornar Map vazia imediatamente
      const r = await port.countByContractor('supplier', []);
      assert.ok(r.ok, `countByContractor([]) falhou: ${!r.ok ? r.error : ''}`);
      if (!r.ok) return;

      assert.equal(r.value.size, 0, 'Map deve estar vazia para ids=[]');
    });

    // ── CA-5: contractorIdsWithContractStatus ─────────────────────────────────

    it('CA-5: contractorIdsWithContractStatus(supplier, Active) → apenas SUP_A + SUP_B', async () => {
      if (handle === null) return;
      const port = createDrizzleContractCountReadStore(handle);

      const r = await port.contractorIdsWithContractStatus('supplier', 'Active');
      assert.ok(r.ok, `contractorIdsWithContractStatus falhou: ${!r.ok ? r.error : ''}`);
      if (!r.ok) return;

      assert.ok(r.value.has(SUP_A), 'SUP_A deve estar no resultado Active');
      assert.ok(r.value.has(SUP_B), 'SUP_B deve estar no resultado Active');
      assert.ok(!r.value.has(SUP_C), 'SUP_C não tem contratos — não deve aparecer');
    });

    it('CA-5: contractorIdsWithContractStatus(supplier, Expired) → apenas SUP_A', async () => {
      if (handle === null) return;
      const port = createDrizzleContractCountReadStore(handle);

      const r = await port.contractorIdsWithContractStatus('supplier', 'Expired');
      assert.ok(r.ok, `contractorIdsWithContractStatus falhou: ${!r.ok ? r.error : ''}`);
      if (!r.ok) return;

      assert.ok(r.value.has(SUP_A), 'SUP_A tem contrato Expired — deve aparecer');
      assert.ok(!r.value.has(SUP_B), 'SUP_B não tem contrato Expired — não deve aparecer');
    });

    it('CA-5: contractorIdsWithContractStatus não vaza entre tipos (collaborator ≠ supplier)', async () => {
      if (handle === null) return;
      const port = createDrizzleContractCountReadStore(handle);

      const r = await port.contractorIdsWithContractStatus('supplier', 'Active');
      assert.ok(r.ok);
      if (!r.ok) return;

      // COL_A tem contrato Active, mas é collaborator → não deve aparecer na query supplier
      assert.ok(!r.value.has(COL_A), 'COL_A é collaborator — não deve vazar para supplier');
    });

    // ── CA-6: contractorIdsWithAnyContract ────────────────────────────────────

    it('CA-6: contractorIdsWithAnyContract(supplier) → SUP_A + SUP_B; SUP_C ausente', async () => {
      if (handle === null) return;
      const port = createDrizzleContractCountReadStore(handle);

      const r = await port.contractorIdsWithAnyContract('supplier');
      assert.ok(r.ok, `contractorIdsWithAnyContract falhou: ${!r.ok ? r.error : ''}`);
      if (!r.ok) return;

      assert.ok(r.value.has(SUP_A), 'SUP_A deve aparecer');
      assert.ok(r.value.has(SUP_B), 'SUP_B deve aparecer');
      assert.ok(!r.value.has(SUP_C), 'SUP_C não tem contratos — não deve aparecer');
      // COL_A é collaborator, não deve vazar
      assert.ok(!r.value.has(COL_A), 'COL_A é collaborator — não deve vazar');
    });

    it('CA-6: contractorIdsWithAnyContract(collaborator) → COL_A', async () => {
      if (handle === null) return;
      const port = createDrizzleContractCountReadStore(handle);

      const r = await port.contractorIdsWithAnyContract('collaborator');
      assert.ok(r.ok, `contractorIdsWithAnyContract falhou: ${!r.ok ? r.error : ''}`);
      if (!r.ok) return;

      assert.ok(r.value.has(COL_A), 'COL_A tem contrato como collaborator — deve aparecer');
      assert.ok(!r.value.has(SUP_A), 'SUP_A é supplier — não deve vazar para collaborator');
    });
  });
}
