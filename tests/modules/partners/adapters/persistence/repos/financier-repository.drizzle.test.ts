/**
 * PARTNERS-FINANCIER-PERSISTENCE — repo Drizzle/MySQL — gated MYSQL_INTEGRATION=1.
 *
 * DEVE FALHAR em W0 (createDrizzleFinancierStore inexistente). Roda contra MySQL
 * real (docker compose). Truncate no beforeEach. Sem este env, suite é skipped.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleFinancierStore } from '#src/modules/partners/adapters/persistence/repos/financier-repository.drizzle.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const clock = ClockFixed(new Date('2026-06-01T12:00:00.000Z'));

const buildActive = (cnpjRaw: string) => {
  const r = Financier.register({
    id: FinancierId.generate(),
    name: 'Fundação Bem Comum',
    corporateName: 'Fundação Bem Comum LTDA',
    legalRepresentative: 'Maria Silva',
    cnpj: cnpjRaw,
    telephone: '+5511999998888',
    address: 'Av. Paulista, 1000',
    registeredAt: clock.now(),
  });
  if (!r.ok) throw new Error('fixture financier');
  return r.value.financier;
};

if (integrationEnabled()) {
  let handle: PartnersMysqlHandle | null = null;

  before(async () => {
    const opened = await openPartnersMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!opened.ok) throw new Error(`open failed: ${opened.error}`);
    handle = opened.value;
  });

  after(async () => {
    if (handle !== null) await handle.close();
  });

  beforeEach(async () => {
    if (handle !== null) await handle.db.delete(handle.schema.parFinanciers);
  });

  describe('DrizzleFinancierStore', () => {
    it('save → findById round-trip', async () => {
      if (handle === null) return;
      const repo = createDrizzleFinancierStore(handle, clock);
      const f = buildActive('11222333000181');
      assert.equal(isOk(await repo.save(f)), true);

      const found = await repo.findById(f.id);
      assert.equal(isOk(found), true);
      if (found.ok && found.value !== null) {
        assert.equal(found.value.cnpj, f.cnpj);
        assert.equal(found.value.status, 'Active');
      }
    });

    it('findByCnpj acha o persistido', async () => {
      if (handle === null) return;
      const repo = createDrizzleFinancierStore(handle, clock);
      const f = buildActive('11222333000181');
      await repo.save(f);
      const c = Cnpj.parse('11222333000181');
      if (c.ok) {
        const found = await repo.findByCnpj(c.value);
        assert.equal(isOk(found), true);
        if (found.ok) assert.notEqual(found.value, null);
      }
    });

    it('list retorna os persistidos', async () => {
      if (handle === null) return;
      const repo = createDrizzleFinancierStore(handle, clock);
      await repo.save(buildActive('11222333000181'));
      const listed = await repo.list();
      assert.equal(isOk(listed), true);
      if (listed.ok) assert.equal(listed.value.length, 1);
    });

    it('CNPJ duplicado (id distinto) → financier-cnpj-duplicate', async () => {
      if (handle === null) return;
      const repo = createDrizzleFinancierStore(handle, clock);
      await repo.save(buildActive('11222333000181'));
      const dup = await repo.save(buildActive('11.222.333/0001-81'));
      assert.equal(isErr(dup), true);
      if (!dup.ok) assert.equal(dup.error, 'financier-cnpj-duplicate');
    });
  });
}
