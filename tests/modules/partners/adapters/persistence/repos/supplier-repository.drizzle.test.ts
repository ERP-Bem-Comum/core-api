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
import type { SupplierEvent } from '#src/modules/partners/domain/supplier/events.ts';

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
    if (handle !== null) {
      await handle.db.delete(handle.schema.parOutbox);
      await handle.db.delete(handle.schema.parSuppliers);
    }
  });

  describe('DrizzleSupplierStore', () => {
    it('save → findById round-trip (bankAccount preservado)', async () => {
      if (handle === null) return;
      const repo = createDrizzleSupplierStore(handle, clock);
      const s = buildActive('11222333000181', { bankAccount: bankInput(), pixKey: null });
      assert.equal(isOk(await repo.save(s, [])), true);

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
      await repo.save(s, []);
      const found = await repo.findById(s.id);
      if (found.ok && found.value !== null) {
        assert.equal(found.value.bankAccount, null);
        assert.equal(found.value.pixKey?.key, 'contato@fornecedor.com.br');
      }
    });

    it('findByCnpj acha o persistido', async () => {
      if (handle === null) return;
      const repo = createDrizzleSupplierStore(handle, clock);
      await repo.save(buildActive('11222333000181'), []);
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
      await repo.save(buildActive('11222333000181'), []);
      const listed = await repo.list();
      assert.equal(isOk(listed), true);
      if (listed.ok) assert.equal(listed.value.length, 1);
    });

    it('CNPJ duplicado (id distinto) → supplier-cnpj-duplicate', async () => {
      if (handle === null) return;
      const repo = createDrizzleSupplierStore(handle, clock);
      await repo.save(buildActive('11222333000181'), []);
      const dup = await repo.save(buildActive('11.222.333/0001-81'), []);
      assert.equal(isErr(dup), true);
      if (!dup.ok) assert.equal(dup.error, 'supplier-cnpj-duplicate');
    });
  });

  // PAR-SUPPLIER-EVENTS — atomicidade estado + outbox na MESMA transação (ADR-0015/0043).
  describe('DrizzleSupplierStore — outbox atômico', () => {
    const registeredEvent = (s: ReturnType<typeof buildActive>): SupplierEvent => ({
      type: 'SupplierRegistered',
      supplierId: s.id,
      cnpj: s.cnpj,
      occurredAt: clock.now(),
    });

    it('save(supplier, [event]) → supplier + 1 row em par_outbox na mesma tx', async () => {
      if (handle === null) return;
      const repo = createDrizzleSupplierStore(handle, clock);
      const s = buildActive('11222333000181');

      const saved = await repo.save(s, [registeredEvent(s)]);
      assert.equal(isOk(saved), true);

      const suppliers = await handle.db.select().from(handle.schema.parSuppliers);
      assert.equal(suppliers.length, 1);

      const outboxRows = await handle.db.select().from(handle.schema.parOutbox);
      assert.equal(outboxRows.length, 1);
      const row = outboxRows[0];
      assert.ok(row !== undefined);
      assert.equal(row.aggregateType, 'Supplier');
      assert.equal(row.aggregateId, String(s.id));
      assert.equal(row.eventType, 'SupplierRegistered');
      const payload = JSON.parse(row.payload) as Record<string, unknown>;
      assert.equal(payload['supplierRef'], String(s.id));
      assert.equal(payload['name'], s.name);
      assert.equal(payload['document'], String(s.cnpj));
    });

    it('rollback da escrita → 0 rows de outbox (CNPJ duplicado aborta a tx)', async () => {
      if (handle === null) return;
      const repo = createDrizzleSupplierStore(handle, clock);
      const first = buildActive('11222333000181');
      await repo.save(first, [registeredEvent(first)]);

      // Segundo supplier com MESMO CNPJ (id distinto) → ER_DUP_ENTRY no INSERT do supplier,
      // dentro da MESMA tx que faria o append do outbox → rollback total.
      const outboxBefore = await handle.db.select().from(handle.schema.parOutbox);
      const dupSupplier = buildActive('11.222.333/0001-81');
      const dup = await repo.save(dupSupplier, [registeredEvent(dupSupplier)]);
      assert.equal(isErr(dup), true);
      if (!dup.ok) assert.equal(dup.error, 'supplier-cnpj-duplicate');

      const outboxAfter = await handle.db.select().from(handle.schema.parOutbox);
      // Nenhuma row nova de outbox para o supplier duplicado (atomicidade).
      assert.equal(outboxAfter.length, outboxBefore.length);
    });
  });
}
