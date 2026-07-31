/**
 * issue #425 — W0 (RED) — backfill de renumeração pelo ano de vigência inicial.
 *
 * Estrutura (molde `contract-taxonomy-refs.drizzle-mysql.test.ts`):
 *   1) BLOCO ESTRUTURAL (sempre roda, SEM DB) — o job exporta a função de backfill.
 *   2) BLOCO INTEGRAÇÃO (opt-in `MYSQL_INTEGRATION=1`) — contra MySQL real:
 *      • renumera afetados (ano do sufixo ≠ YEAR(original_period_start)), preserva a sequência;
 *      • resolve COLISÃO (dois → mesmo ano+seq) sem duplicar (UNIQUE respeitada);
 *      • deixa intactos os já corretos + pula os de formato inesperado;
 *      • RECONCILIA `ctr_contract_seq` (nextSequentialNumber(ano) não colide com preservado);
 *      • IDEMPOTÊNCIA: 2ª execução → 0 afetados.
 *
 * Registrado no grupo `contracts` de scripts/ci/test-integration.ts. Contrato de isolamento:
 * limpa por TABELA na entrada (inclui `ctr_contract_seq`).
 *
 * Código EN, comentários PT-BR.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { eq } from 'drizzle-orm';

import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import { renumberContractsByVigencia } from '#src/jobs/contracts/renumber-by-vigencia/renumber.ts';
import { parseSequentialNumber } from '#src/modules/contracts/domain/contract/sequential-number.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

// ─────────────────────────────────────────────────────────────────────────────
// 1) ESTRUTURAL — sempre roda, sem DB.
// ─────────────────────────────────────────────────────────────────────────────
describe('issue #425 — renumberContractsByVigencia export', () => {
  it('é uma função', () => {
    assert.equal(typeof renumberContractsByVigencia, 'function');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2) INTEGRAÇÃO — opt-in MYSQL_INTEGRATION=1.
// ─────────────────────────────────────────────────────────────────────────────
if (integrationEnabled()) {
  const VALID_CONN = mysqlTestConnectionString();

  // Ids ordenados (asc) — a ordem determinística do job é por id: A antes de B garante que A
  // PRESERVA 0005/2024 e B (colidindo) REATRIBUI.
  const A = '11111111-1111-4111-8111-111111111111';
  const B = '22222222-2222-4222-8222-222222222222';
  const C = '33333333-3333-4333-8333-333333333333';
  const E = '44444444-4444-4444-8444-444444444444';

  const utc = (y: number, m: number, d: number): Date => new Date(Date.UTC(y, m - 1, d));

  let handle: MysqlHandle | null = null;

  const cleanAll = async (h: MysqlHandle): Promise<void> => {
    const { db, schema } = h;
    // Ordem FK: filhas → pai. Inclui ctr_contract_seq (contrato de isolamento do #425).
    await db.delete(schema.contractHomologatedAmendments);
    await db.delete(schema.amendments);
    await db.delete(schema.contracts);
    await db.delete(schema.ctrContractSeq);
  };

  // Semeia um contrato Active mínimo (respeita os CHECKs: Active ⇒ signed/current preenchidos,
  // endedAt NULL). `startYear` controla YEAR(original_period_start) (base da derivação #425).
  const seedContract = async (
    h: MysqlHandle,
    id: string,
    sequentialNumber: string,
    start: Date,
  ): Promise<void> => {
    await h.db.insert(h.schema.contracts).values({
      id,
      sequentialNumber,
      title: `seed ${sequentialNumber}`,
      objective: 'seed',
      signedAt: start,
      originalValueCents: 100_000,
      originalPeriodKind: 'Fixed',
      originalPeriodStart: start,
      originalPeriodEnd: utc(start.getUTCFullYear(), 12, 31),
      currentValueCents: 100_000,
      currentPeriodKind: 'Fixed',
      currentPeriodStart: start,
      currentPeriodEnd: utc(start.getUTCFullYear(), 12, 31),
      status: 'Active',
      contractorType: 'supplier',
      contractorId: '55555555-5555-4555-8555-555555555555',
      classification: 'CT',
    });
  };

  // Cenário canônico:
  //   A 0005/2026 · início 2024 → afetado (alvo 2024) → PRESERVA 0005/2024
  //   B 0005/2020 · início 2024 → afetado (alvo 2024, colide com A) → REATRIBUI
  //   C 0007/2023 · início 2023 → já correto → NÃO tocado
  //   E legacy-xyz · início 2024 → formato inesperado → PULADO
  const seedScenario = async (h: MysqlHandle): Promise<void> => {
    await seedContract(h, A, '0005/2026', utc(2024, 1, 15));
    await seedContract(h, B, '0005/2020', utc(2024, 7, 20));
    await seedContract(h, C, '0007/2023', utc(2023, 3, 3));
    await seedContract(h, E, 'legacy-xyz', utc(2024, 1, 1));
  };

  const numberOf = async (h: MysqlHandle, id: string): Promise<string> => {
    const rows = await h.db
      .select({ n: h.schema.contracts.sequentialNumber })
      .from(h.schema.contracts)
      .where(eq(h.schema.contracts.id, id));
    return rows[0]?.n ?? '<none>';
  };

  before(async () => {
    const r = await openMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle) await handle.close();
  });

  beforeEach(async () => {
    if (handle === null) throw new Error('fixture: handle não inicializado');
    await cleanAll(handle);
    await seedScenario(handle);
  });

  describe('renumberContractsByVigencia — MySQL real', () => {
    it('renumera afetados, preserva os corretos e pula os malformados', async () => {
      const h = handle;
      if (h === null) throw new Error('handle');

      const r = await renumberContractsByVigencia(h);
      assert.equal(r.ok, true);
      if (!r.ok) return;

      assert.equal(r.value.affected, 2, 'A e B afetados');
      assert.equal(r.value.preserved, 1, 'A preserva');
      assert.equal(r.value.reassigned, 1, 'B reatribui');
      assert.equal(r.value.skippedMalformed, 1, 'E pulado');
      assert.deepEqual(r.value.reconciledYears, [2024]);

      assert.equal(await numberOf(h, A), '0005/2024', 'A preserva a seq trocando o ano');
      assert.equal(await numberOf(h, C), '0007/2023', 'C intacto (já correto)');
      assert.equal(await numberOf(h, E), 'legacy-xyz', 'E intacto (malformado)');
    });

    it('resolve colisão sem duplicar (UNIQUE respeitada)', async () => {
      const h = handle;
      if (h === null) throw new Error('handle');

      const r = await renumberContractsByVigencia(h);
      assert.equal(r.ok, true);

      const na = await numberOf(h, A);
      const nb = await numberOf(h, B);
      assert.equal(na, '0005/2024');
      assert.notEqual(nb, na, 'B não pode colidir com A');
      // B reatribuído para o ano-alvo 2024.
      const pb = parseSequentialNumber(nb);
      assert.ok(pb !== null && pb.year === 2024, `B deve estar em /2024: ${nb}`);
    });

    it('reconcilia ctr_contract_seq — nextSequentialNumber(2024) não colide com preservado', async () => {
      const h = handle;
      if (h === null) throw new Error('handle');

      const r = await renumberContractsByVigencia(h);
      assert.equal(r.ok, true);

      // max(seq) de 2024 após o job = 5 (0005/2024 preservado). O contador deve estar >= 5,
      // então o próximo é 0006/2024 — NUNCA 0005/2024 nem 0001/2024 (já ocupados).
      const repo = createDrizzleContractRepository(h);
      const next = await repo.nextSequentialNumber(2024);
      assert.equal(next.ok, true);
      if (!next.ok) return;

      const existing = new Set([await numberOf(h, A), await numberOf(h, B)]);
      assert.equal(existing.has(next.value), false, `${next.value} colidiria com preservado`);
      const p = parseSequentialNumber(next.value);
      assert.ok(
        p !== null && p.year === 2024 && p.seq >= 6,
        `esperava >= 0006/2024: ${next.value}`,
      );
    });

    it('idempotente: 2ª execução → 0 afetados, números estáveis', async () => {
      const h = handle;
      if (h === null) throw new Error('handle');

      const first = await renumberContractsByVigencia(h);
      assert.equal(first.ok, true);
      if (!first.ok) return;
      assert.equal(first.value.affected, 2);

      const aAfter1 = await numberOf(h, A);
      const bAfter1 = await numberOf(h, B);

      const second = await renumberContractsByVigencia(h);
      assert.equal(second.ok, true);
      if (!second.ok) return;
      assert.equal(second.value.affected, 0, '2ª execução não toca nada');
      assert.equal(second.value.skippedMalformed, 1, 'E segue pulado');
      assert.deepEqual(second.value.reconciledYears, []);

      assert.equal(await numberOf(h, A), aAfter1, 'A estável');
      assert.equal(await numberOf(h, B), bAfter1, 'B estável');
    });
  });
}
