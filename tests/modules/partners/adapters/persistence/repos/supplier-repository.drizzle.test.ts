/**
 * PARTNERS-SUPPLIER-PERSISTENCE — repo Drizzle/MySQL — gated MYSQL_INTEGRATION=1.
 *
 * DEVE FALHAR em W0 (createDrizzleSupplierStore inexistente). Roda contra MySQL
 * real (docker compose). Truncate no beforeEach. Sem este env, suite é skipped.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Cnpj from '#src/shared/kernel/cnpj.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleSupplierStore } from '#src/modules/partners/adapters/persistence/repos/supplier-repository.drizzle.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const clock = ClockFixed(new Date('2026-06-01T12:00:00.000Z'));

const bankInput = () => ({
  bank: '001',
  agency: '0001-2',
  accountNumber: '123456',
  checkDigit: '7',
});
const pixInput = () => ({ keyType: 'email', key: 'contato@fornecedor.com.br' });

const buildActive = (
  cnpjRaw: string,
  over: {
    bankAccount?: ReturnType<typeof bankInput> | null;
    pixKey?: ReturnType<typeof pixInput> | null;
  } = {},
) => {
  const r = Supplier.register({
    id: SupplierId.generate(),
    name: 'Fornecedor X',
    email: 'contato@fornecedor.com.br',
    cnpj: cnpjRaw,
    corporateName: 'Fornecedor X LTDA',
    fantasyName: 'FX',
    serviceCategory: 'INFORMATICA',
    // `in` (não `??`) para distinguir "não informado" de "explicitamente null".
    bankAccount: 'bankAccount' in over ? over.bankAccount : bankInput(),
    pixKey: 'pixKey' in over ? over.pixKey : null,
    registeredAt: clock.now(),
  });
  if (!r.ok) throw new Error(`fixture supplier: ${r.error}`);
  return r.value.supplier;
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
    if (handle !== null) await handle.db.delete(handle.schema.parSuppliers);
  });

  describe('DrizzleSupplierStore', () => {
    it('save → findById round-trip (bankAccount preservado)', async () => {
      if (handle === null) return;
      const repo = createDrizzleSupplierStore(handle, clock);
      const s = buildActive('11222333000181', { bankAccount: bankInput(), pixKey: null });
      assert.equal(isOk(await repo.save(s)), true);

      const found = await repo.findById(s.id);
      assert.equal(isOk(found), true);
      if (found.ok && found.value !== null) {
        assert.equal(found.value.cnpj, s.cnpj);
        assert.equal(found.value.status, 'Active');
        assert.equal(found.value.bankAccount?.accountNumber, '123456');
      }
    });

    it('round-trip pixKey preserva campos achatados', async () => {
      if (handle === null) return;
      const repo = createDrizzleSupplierStore(handle, clock);
      const s = buildActive('11222333000181', { bankAccount: null, pixKey: pixInput() });
      await repo.save(s);
      const found = await repo.findById(s.id);
      if (found.ok && found.value !== null) {
        assert.equal(found.value.bankAccount, null);
        assert.equal(found.value.pixKey?.key, 'contato@fornecedor.com.br');
      }
    });

    it('findByCnpj acha o persistido', async () => {
      if (handle === null) return;
      const repo = createDrizzleSupplierStore(handle, clock);
      await repo.save(buildActive('11222333000181'));
      const c = Cnpj.parse('11222333000181');
      if (c.ok) {
        const found = await repo.findByCnpj(c.value);
        assert.equal(isOk(found), true);
        if (found.ok) assert.notEqual(found.value, null);
      }
    });

    it('list retorna os persistidos', async () => {
      if (handle === null) return;
      const repo = createDrizzleSupplierStore(handle, clock);
      await repo.save(buildActive('11222333000181'));
      const listed = await repo.list();
      assert.equal(isOk(listed), true);
      if (listed.ok) assert.equal(listed.value.length, 1);
    });

    it('CNPJ duplicado (id distinto) → supplier-cnpj-duplicate', async () => {
      if (handle === null) return;
      const repo = createDrizzleSupplierStore(handle, clock);
      await repo.save(buildActive('11222333000181'));
      const dup = await repo.save(buildActive('11.222.333/0001-81'));
      assert.equal(isErr(dup), true);
      if (!dup.ok) assert.equal(dup.error, 'supplier-cnpj-duplicate');
    });
  });
}
