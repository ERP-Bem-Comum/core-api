/**
 * CONTRACTS-CONTRACTOR-METADATA-DOMAIN — W0 (RED) — integração MySQL.
 *
 * Verifica, no MySQL real, que `ctr_contracts` persiste `contractor_*` (NOT NULL +
 * CHECK do tipo) e os metadados nullable — via round-trip pelo repo Drizzle.
 *
 * Opt-in `MYSQL_INTEGRATION=1` (padrão #3, igual a `drizzle-mysql.test.ts`). Sem o
 * env var (gate default `pnpm test`), o corpo é no-op — NÃO polui o gate puro
 * (política de regressão zero / anti-padrão #14). W1 inclui este arquivo no glob
 * de `pnpm run test:integration`.
 *
 * RED por inexistência: até o W1 criar `ContractorRef`, as colunas e o mapeamento
 * row↔domínio, o round-trip do contractor/metadados falha.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';

import { openMysql } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import type { MysqlHandle } from '#src/modules/contracts/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleContractRepository } from '#src/modules/contracts/adapters/persistence/repos/contract-repository.drizzle.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as Period from '#src/shared/kernel/period.ts';
import * as PlainDate from '#src/shared/kernel/plain-date.ts';
import * as ContractId from '#src/modules/contracts/domain/shared/contract-id.ts';
import * as ContractorRef from '#src/modules/contracts/domain/shared/contractor.ts';
import { Contract } from '#src/modules/contracts/domain/contract/contract.ts';
import { updateContract } from '#src/modules/contracts/domain/contract/types.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const VALID_CONN = mysqlTestConnectionString();
const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';
const FINANCIER_UUID = '7f3a1234-5678-4abc-9def-fedcba987654';

if (integrationEnabled()) {
  let handle: MysqlHandle | null = null;

  before(async () => {
    const r = await openMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle) await handle.close();
  });

  describe('ctr_contracts — persistência de contractor + metadados (MySQL)', () => {
    it('round-trip preserva contractor (NOT NULL + CHECK) e metadados nullable', async () => {
      assert.ok(handle, 'handle MySQL não inicializado');
      if (!handle) return;
      await handle.db.delete(handle.schema.contracts);

      const repo = createDrizzleContractRepository(handle);
      const contractor = ContractorRef.make('financier', FINANCIER_UUID);
      assert.equal(contractor.ok, true);
      if (!contractor.ok) return;

      const start = PlainDate.from('2026-01-01');
      const end = PlainDate.from('2026-12-31');
      assert.equal(start.ok && end.ok, true);
      if (!start.ok || !end.ok) return;
      const period = Period.create(start.value, end.value);
      const money = Money.fromCents(5_000_000);
      assert.equal(period.ok && money.ok, true);
      if (!period.ok || !money.ok) return;

      const created = Contract.create({
        id: ContractId.generate(),
        sequentialNumber: '777/2026',
        title: 'Integração contractor',
        objective: 'Persistir contractor + metadados',
        signedAt: new Date('2026-01-15'),
        originalValue: money.value,
        originalPeriod: period.value,
        contractor: contractor.value,
      });
      assert.equal(created.ok, true);
      if (!created.ok) return;

      const withMeta = updateContract(created.value.contract, { observations: 'persisted' });
      const saved = await repo.save(withMeta, []);
      assert.equal(saved.ok, true);

      const loaded = await repo.findById(withMeta.id);
      assert.equal(loaded.ok, true);
      if (!loaded.ok || loaded.value === null) {
        assert.fail('contrato não persistido');
        return;
      }
      assert.deepEqual(loaded.value.contractor, contractor.value);
      assert.equal(loaded.value.observations, 'persisted');
      assert.equal(loaded.value.email, null);
    });
  });
}
