/**
 * Integração (#437 · REPORTS-SUPPLIERS-NO-ACTIVE-CONTRACT) — buildContractsActiveContractorReadPort
 * (contracts public-api).
 *
 * Lê `ctr_contracts` WHERE `status = 'Active'` AND `contractor_type = 'supplier'`,
 * `SELECT DISTINCT contractor_id`. É a fonte do anti-join do relatório "Fornecedores sem Contrato" —
 * o `reports` subtrai este conjunto dos candidatos do `financial` EM MEMÓRIA (JOIN `ctr_*` × `fin_*`
 * é proibido — ADR-0006 `:150`/`:154`, ADR-0014 `:130`).
 *
 * Semântica travada pela decisão 1 do 000-request: SÓ `Active` conta. `Pending` é rascunho sem
 * assinatura/vigência (CHECK `ctr_contracts_pending_consistency_chk`) → NÃO é contrato.
 * `Expired`/`Terminated`/`Cancelled` também não. Por isso NÃO reusa
 * `ContractCountReadPort.listActiveContractCountsByContractor()`, cujo `LIVE_STATUSES` inclui
 * 'Pending' por paridade backfill×worker (`contract-count-read.drizzle.ts:18`) — port novo, o
 * existente não se toca.
 *
 * Aproveita o índice composto já existente `ctr_contracts_contractor_idx (contractor_id, status)`.
 * Pool **boot-scoped**: aberto uma vez, fechado no `close()` (F1 do W2 #238 / incidente RDS 0001).
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `contracts`).
 * W0 RED: `buildContractsActiveContractorReadPort` ainda não existe.
 *
 * Molde: `tests/jobs/partners/contract-count-backfill.integration.test.ts`.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { inArray } from 'drizzle-orm';

import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { buildContractsActiveContractorReadPort } from '#src/modules/contracts/public-api/index.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[contracts:active-contractor-read] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString = process.env['CONTRACTS_DATABASE_URL'] ?? mysqlTestConnectionString();

  // Contratantes isolados por este teste. `listContractorsWithActiveContract()` é global (lê o DB
  // inteiro), então toda asserção é escopada a estes refs — coexiste com o resto da suíte.
  const ACTIVE = 'd1000000-0000-4000-8000-0000000000d1'; // 1 Active           → aparece
  const PENDING = 'd2000000-0000-4000-8000-0000000000d2'; // 1 Pending          → NÃO aparece
  const EXPIRED = 'd3000000-0000-4000-8000-0000000000d3'; // 1 Expired          → NÃO aparece
  const TERMINATED = 'd4000000-0000-4000-8000-0000000000d4'; // 1 Terminated     → NÃO aparece
  const CANCELLED = 'd5000000-0000-4000-8000-0000000000d5'; // 1 Cancelled      → NÃO aparece
  const FINANCIER = 'd6000000-0000-4000-8000-0000000000d6'; // Active, type≠supplier → NÃO aparece
  const TWICE = 'd7000000-0000-4000-8000-0000000000d7'; // 2 Active           → 1 entrada (DISTINCT)
  const MIXED = 'd8000000-0000-4000-8000-0000000000d8'; // Pending + Active   → aparece
  const REFS = [ACTIVE, PENDING, EXPIRED, TERMINATED, CANCELLED, FINANCIER, TWICE, MIXED] as const;

  // Vigência efetiva preenchida — exigida pelo CHECK `ctr_contracts_pending_consistency_chk`
  // para todo status FORA de ('Pending','Cancelled').
  const signedFields = {
    signedAt: new Date('2026-01-01'),
    originalValueCents: 1000,
    originalPeriodKind: 'Fixed' as const,
    originalPeriodStart: new Date('2026-01-01'),
    originalPeriodEnd: new Date('2026-12-31'),
    currentValueCents: 1000,
    currentPeriodKind: 'Fixed' as const,
    currentPeriodStart: new Date('2026-01-01'),
    currentPeriodEnd: new Date('2026-12-31'),
  };
  // Rascunho: signedAt + current* nulos (mesmo CHECK, lado 'Pending'/'Cancelled').
  const draftFields = {
    signedAt: null,
    originalValueCents: 1000,
    originalPeriodKind: 'Fixed' as const,
    originalPeriodStart: new Date('2026-01-01'),
    originalPeriodEnd: new Date('2026-12-31'),
    currentValueCents: null,
    currentPeriodKind: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
  };

  describe('buildContractsActiveContractorReadPort — Drizzle + MySQL (#437)', () => {
    let handle: MysqlHandle;
    let seq = 0;

    const seedContract = async (
      contractorId: string,
      status: 'Pending' | 'Active' | 'Expired' | 'Terminated' | 'Cancelled',
      contractorType: 'supplier' | 'financier' = 'supplier',
    ): Promise<void> => {
      seq += 1;
      // `ended_at` é bicondicional com status terminado (CHECK `ctr_contracts_ended_at_consistency_chk`).
      const ended = status === 'Expired' || status === 'Terminated' || status === 'Cancelled';
      // Rascunho (sem assinatura/vigência) ⟺ status IN ('Pending','Cancelled').
      const fields = status === 'Pending' || status === 'Cancelled' ? draftFields : signedFields;
      await handle.db.insert(handle.schema.contracts).values({
        id: `e${String(seq).padStart(7, '0')}-0000-4000-8000-00000000e${String(seq).padStart(3, '0')}`,
        sequentialNumber: `437-${String(seq).padStart(4, '0')}`,
        title: 'seed 437',
        objective: 'seed 437',
        contractorType,
        contractorId,
        status,
        endedAt: ended ? new Date('2026-02-01') : null,
        ...fields,
      });
    };

    before(async () => {
      const r = await openMysql({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[contracts:active-contractor-read] conexão: ${r.error}`);
      handle = r.value;

      // Dono das próprias precondições (limpa só os refs deste teste).
      await handle.db
        .delete(handle.schema.contracts)
        .where(inArray(handle.schema.contracts.contractorId, [...REFS]));

      await seedContract(ACTIVE, 'Active');
      await seedContract(PENDING, 'Pending');
      await seedContract(EXPIRED, 'Expired');
      await seedContract(TERMINATED, 'Terminated');
      await seedContract(CANCELLED, 'Cancelled');
      await seedContract(FINANCIER, 'Active', 'financier');
      await seedContract(TWICE, 'Active');
      await seedContract(TWICE, 'Active');
      await seedContract(MIXED, 'Pending');
      await seedContract(MIXED, 'Active');
    });

    after(async () => {
      await handle?.close();
    });

    const listRefs = async (): Promise<readonly string[]> => {
      const portR = await buildContractsActiveContractorReadPort({ connectionString });
      assert.equal(portR.ok, true, JSON.stringify(portR));
      if (!portR.ok) throw new Error('port não abriu');
      const port = portR.value;
      const r = await port.listContractorsWithActiveContract();
      await port.close();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) throw new Error('list falhou');
      return r.value;
    };

    it('CA1: contratante com contrato Active (contractor_type=supplier) aparece', async () => {
      const refs = await listRefs();
      assert.equal(refs.includes(ACTIVE), true, 'Active deve aparecer');
    });

    it('CA2: Pending NÃO conta como contrato (rascunho sem assinatura/vigência)', async () => {
      const refs = await listRefs();
      assert.equal(refs.includes(PENDING), false, 'Pending é rascunho — não é contrato');
    });

    it('CA2: Expired / Terminated / Cancelled NÃO contam', async () => {
      const refs = await listRefs();
      assert.equal(refs.includes(EXPIRED), false, 'Expired fora');
      assert.equal(refs.includes(TERMINATED), false, 'Terminated fora');
      assert.equal(refs.includes(CANCELLED), false, 'Cancelled fora');
    });

    it('CA1: contractor_type ≠ supplier NÃO aparece (mesmo com contrato Active)', async () => {
      const refs = await listRefs();
      assert.equal(refs.includes(FINANCIER), false, 'financier fora do relatório de fornecedores');
    });

    it('CA1: DISTINCT — 2 contratos Active do mesmo contratante → 1 entrada', async () => {
      const refs = await listRefs();
      assert.equal(
        refs.filter((ref) => ref === TWICE).length,
        1,
        'sem duplicata no SELECT DISTINCT',
      );
    });

    it('CA2: Pending + Active no mesmo contratante → aparece (basta 1 Active)', async () => {
      const refs = await listRefs();
      assert.equal(refs.filter((ref) => ref === MIXED).length, 1, 'aparece 1x, pelo Active');
    });

    it('pool boot-scoped: close() encerra o pool (2ª chamada após close falha)', async () => {
      const portR = await buildContractsActiveContractorReadPort({ connectionString });
      assert.equal(portR.ok, true, JSON.stringify(portR));
      if (!portR.ok) return;
      const port = portR.value;

      const first = await port.listContractorsWithActiveContract();
      assert.equal(first.ok, true, 'reader vivo antes do close');

      await port.close();

      // Pool fechado → o adapter converte a exception do driver em Result.err (nunca vaza throw).
      const afterClose = await port.listContractorsWithActiveContract();
      assert.equal(afterClose.ok, false, 'após close() o reader não serve mais leitura');
    });
  });
}
