/**
 * Integração (REP-6 · #442 · Slice D) — buildContractsContractNumberReadPort (contracts public-api).
 *
 * Lê `ctr_contracts` (`SELECT id, sequential_number WHERE id IN (:ids)`) e monta o Map
 * `id → sequential_number`. Fonte do NÚMERO do contrato do Relatório Geral — o `reports` resolve o
 * número a partir do `contractRef` (UUID) EM MEMÓRIA, na costura da página (JOIN `ctr_*` × `fin_*` é
 * proibido — ADR-0006 `:150`/`:154`, ADR-0014 `:130`). Sem migration: `sequential_number` já existe
 * (varchar(16), NOT NULL, UNIQUE).
 *
 * Batch: 1 query por página; `ids` vazio → Map vazio sem tocar o banco; dedup de ids antes do IN;
 * id inexistente simplesmente não aparece no Map.
 *
 * Pool **boot-scoped**: aberto uma vez, fechado no `close()` (incidente RDS 0001).
 *
 * GATE: só roda com MYSQL_INTEGRATION=1 (suíte `contracts`).
 * W0 RED: `buildContractsContractNumberReadPort` ainda não existe.
 *
 * Contrato de isolamento (testing.md): limpa por tabela na ENTRADA os próprios refs; order-independent.
 * Molde: `active-contractor-read.drizzle-mysql.test.ts`.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { inArray } from 'drizzle-orm';

import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { buildContractsContractNumberReadPort } from '#src/modules/contracts/public-api/index.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

if (!process.env['MYSQL_INTEGRATION']) {
  process.stdout.write(
    '[contracts:contract-number-read] MYSQL_INTEGRATION não definido — pulando integração.\n',
  );
} else {
  const connectionString = process.env['CONTRACTS_DATABASE_URL'] ?? mysqlTestConnectionString();

  // Contratos isolados por este teste (ids fixos, escopo próprio).
  const ID_A = 'da000000-0000-4000-8000-0000000000da';
  const ID_B = 'db000000-0000-4000-8000-0000000000db';
  const NUM_A = 'REP6D-0001';
  const NUM_B = 'REP6D-0002';
  const ABSENT = 'dc000000-0000-4000-8000-0000000000dc'; // nunca semeado
  const IDS = [ID_A, ID_B, ABSENT] as const;

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

  describe('buildContractsContractNumberReadPort — Drizzle + MySQL (REP-6 · #442 · Slice D)', () => {
    let handle: MysqlHandle;

    const seedContract = async (id: string, sequentialNumber: string): Promise<void> => {
      await handle.db.insert(handle.schema.contracts).values({
        id,
        sequentialNumber,
        title: 'seed REP6-D',
        objective: 'seed REP6-D',
        contractorType: 'supplier',
        contractorId: 'de000000-0000-4000-8000-0000000000de',
        status: 'Active',
        endedAt: null,
        ...signedFields,
      });
    };

    before(async () => {
      const r = await openMysql({ connectionString, applyMigrations: true, poolLimit: 3 });
      if (!r.ok) throw new Error(`[contracts:contract-number-read] conexão: ${r.error}`);
      handle = r.value;

      // Dono das próprias precondições (limpa só os ids deste teste, na ENTRADA).
      await handle.db
        .delete(handle.schema.contracts)
        .where(inArray(handle.schema.contracts.id, [...IDS]));

      await seedContract(ID_A, NUM_A);
      await seedContract(ID_B, NUM_B);
    });

    after(async () => {
      await handle.db
        .delete(handle.schema.contracts)
        .where(inArray(handle.schema.contracts.id, [...IDS]));
      await handle?.close();
    });

    const resolve = async (ids: readonly string[]): Promise<ReadonlyMap<string, string>> => {
      const portR = await buildContractsContractNumberReadPort({ connectionString });
      assert.equal(portR.ok, true, JSON.stringify(portR));
      if (!portR.ok) throw new Error('port não abriu');
      const port = portR.value;
      const r = await port.resolveContractNumbers(ids);
      await port.close();
      assert.equal(r.ok, true, JSON.stringify(r));
      if (!r.ok) throw new Error('resolveContractNumbers falhou');
      return r.value;
    };

    it('CA1: resolve o Map id → sequential_number dos ids semeados', async () => {
      const map = await resolve([ID_A, ID_B]);
      assert.equal(map.get(ID_A), NUM_A);
      assert.equal(map.get(ID_B), NUM_B);
    });

    it('CA2: id inexistente não aparece no Map', async () => {
      const map = await resolve([ID_A, ABSENT]);
      assert.equal(map.get(ID_A), NUM_A);
      assert.equal(map.has(ABSENT), false, 'id não semeado não entra no Map');
    });

    it('CA3: ids vazio → Map vazio (sem tocar o banco)', async () => {
      const map = await resolve([]);
      assert.equal(map.size, 0);
    });

    it('CA4: dedup — id repetido rende uma única entrada', async () => {
      const map = await resolve([ID_A, ID_A, ID_A]);
      assert.equal(map.size, 1);
      assert.equal(map.get(ID_A), NUM_A);
    });

    it('pool boot-scoped: close() encerra o pool (2ª chamada após close falha)', async () => {
      const portR = await buildContractsContractNumberReadPort({ connectionString });
      assert.equal(portR.ok, true, JSON.stringify(portR));
      if (!portR.ok) return;
      const port = portR.value;

      const first = await port.resolveContractNumbers([ID_A]);
      assert.equal(first.ok, true, 'reader vivo antes do close');

      await port.close();

      // Pool fechado → o adapter converte a exception do driver em Result.err (nunca vaza throw).
      const afterClose = await port.resolveContractNumbers([ID_A]);
      assert.equal(afterClose.ok, false, 'após close() o reader não serve mais leitura');
    });
  });
}
