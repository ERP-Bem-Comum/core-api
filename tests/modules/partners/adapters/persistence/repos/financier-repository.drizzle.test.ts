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

const BANK = { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' };
const PIX = { keyType: 'email', key: 'financeiro@banco.com.br' };

const buildActive = (
  cnpjRaw: string,
  over: {
    bankAccount?: typeof BANK | null;
    pixKey?: typeof PIX | null;
  } = {},
) => {
  const r = Financier.register({
    id: FinancierId.generate(),
    name: 'Fundação Bem Comum',
    corporateName: 'Fundação Bem Comum LTDA',
    legalRepresentative: 'Maria Silva',
    cnpj: cnpjRaw,
    telephone: '+5511999998888',
    address: 'Av. Paulista, 1000',
    bankAccount: over.bankAccount ?? null,
    pixKey: over.pixKey ?? null,
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

    // CA1/CA6 — round-trip real de bankAccount + pixKey através do MySQL.
    it('save → findById preserva bankAccount e pixKey', async () => {
      if (handle === null) return;
      const repo = createDrizzleFinancierStore(handle, clock);
      const f = buildActive('11222333000181', { bankAccount: BANK, pixKey: PIX });
      assert.equal(isOk(await repo.save(f)), true);
      const found = await repo.findById(f.id);
      assert.equal(isOk(found), true);
      if (found.ok && found.value !== null) {
        assert.deepEqual(found.value.bankAccount, BANK);
        assert.deepEqual(found.value.pixKey, PIX);
      }
    });

    // CA2/CA6 — sem destino: nullable persiste e reidrata como null.
    it('save sem destino → findById retorna bankAccount=null e pixKey=null', async () => {
      if (handle === null) return;
      const repo = createDrizzleFinancierStore(handle, clock);
      const f = buildActive('11222333000181');
      await repo.save(f);
      const found = await repo.findById(f.id);
      assert.equal(isOk(found), true);
      if (found.ok && found.value !== null) {
        assert.equal(found.value.bankAccount, null);
        assert.equal(found.value.pixKey, null);
      }
    });

    // CA4 — UPDATE troca banco→pix.
    it('save sobre existente troca banco por pix', async () => {
      if (handle === null) return;
      const repo = createDrizzleFinancierStore(handle, clock);
      const f = buildActive('11222333000181', { bankAccount: BANK });
      await repo.save(f);
      const edited = Financier.edit(
        f,
        {
          name: f.name,
          corporateName: f.corporateName,
          legalRepresentative: f.legalRepresentative,
          cnpj: String(f.cnpj),
          telephone: f.telephone,
          address: f.address,
          bankAccount: null,
          pixKey: PIX,
        },
        clock.now(),
      );
      assert.equal(isOk(edited), true);
      if (!edited.ok) return;
      await repo.save(edited.value.financier);
      const found = await repo.findById(f.id);
      if (found.ok && found.value !== null) {
        assert.equal(found.value.bankAccount, null);
        assert.deepEqual(found.value.pixKey, PIX);
      }
    });

    // CA7 — CHECK de coerência do bloco bancário: bank preenchido mas agency NULL → rejeitado.
    it('INSERT direto com bloco bancário parcial → rejeitado por par_financiers_bank_block_chk', async () => {
      if (handle === null) return;
      const table = handle.schema.parFinanciers;
      await assert.rejects(
        handle.db.insert(table).values({
          id: FinancierId.generate() as unknown as string,
          name: 'X',
          corporateName: 'X LTDA',
          legalRepresentative: 'Y',
          cnpj: '11222333000181',
          telephone: '+551199',
          address: 'Rua A',
          active: true,
          deactivatedAt: null,
          bankAccountBank: '001',
          bankAccountAgency: null,
          bankAccountNumber: null,
          bankAccountCheckDigit: null,
          pixKeyType: null,
          pixKey: null,
          createdAt: clock.now(),
          updatedAt: clock.now(),
          legacyId: null,
        }),
      );
    });

    // CA7 — CHECK de coerência do bloco pix: pix_key_type preenchido mas pix_key NULL → rejeitado.
    it('INSERT direto com bloco pix parcial → rejeitado por par_financiers_pix_block_chk', async () => {
      if (handle === null) return;
      const table = handle.schema.parFinanciers;
      await assert.rejects(
        handle.db.insert(table).values({
          id: FinancierId.generate() as unknown as string,
          name: 'X',
          corporateName: 'X LTDA',
          legalRepresentative: 'Y',
          cnpj: '11222333000181',
          telephone: '+551199',
          address: 'Rua A',
          active: true,
          deactivatedAt: null,
          bankAccountBank: null,
          bankAccountAgency: null,
          bankAccountNumber: null,
          bankAccountCheckDigit: null,
          pixKeyType: 'email',
          pixKey: null,
          createdAt: clock.now(),
          updatedAt: clock.now(),
          legacyId: null,
        }),
      );
    });
  });
}
