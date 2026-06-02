/**
 * PARTNERS-CONTRACTOR-READ-PORT — buildPartnersReadPort (integração) — gated MYSQL_INTEGRATION=1.
 * DEVE FALHAR em W0 (buildPartnersReadPort inexistente). Roda contra MySQL real (docker).
 *
 * Round-trip de LEITURA (CA1/CA5): provisiona via os repos Drizzle (save) e lê pela read
 * port (getSupplierView/getFinancierView/getCollaboratorView). id inexistente → ok(null).
 * Skipa sem MYSQL_INTEGRATION (sem Docker). Truncate no beforeEach.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  buildPartnersReadPort,
  type PartnersReadPort,
} from '#src/modules/partners/public-api/read.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleSupplierStore } from '#src/modules/partners/adapters/persistence/repos/supplier-repository.drizzle.ts';
import { createDrizzleFinancierStore } from '#src/modules/partners/adapters/persistence/repos/financier-repository.drizzle.ts';
import { createDrizzleCollaboratorStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-repository.drizzle.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const clock = ClockFixed(new Date('2026-06-02T12:00:00.000Z'));

const aSupplier = () => {
  const r = Supplier.register({
    id: SupplierId.generate(),
    name: 'Fornecedor X',
    email: 'contato@fornecedor.com.br',
    cnpj: '11222333000181',
    corporateName: 'Fornecedor X LTDA',
    fantasyName: 'FX',
    serviceCategory: 'INFORMATICA',
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: { keyType: 'email', key: 'pix@fornecedor.com.br' },
    registeredAt: clock.now(),
  });
  if (!r.ok) throw new Error(`fixture supplier: ${r.error}`);
  return r.value.supplier;
};

const aFinancier = () => {
  const r = Financier.register({
    id: FinancierId.generate(),
    name: 'Fundação Bem Comum',
    corporateName: 'Fundação Bem Comum LTDA',
    legalRepresentative: 'Maria Silva',
    cnpj: '11444777000161',
    telephone: '+5511999998888',
    address: 'Av. Paulista, 1000',
    registeredAt: clock.now(),
  });
  if (!r.ok) throw new Error(`fixture financier: ${r.error}`);
  return r.value.financier;
};

const aCollaborator = () => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'João Souza',
    email: 'joao@bemcomum.org',
    cpf: '111.444.777-35',
    occupationArea: 'PARC',
    role: 'Educador',
    startOfContract: new Date('2025-02-01T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: clock.now(),
  });
  if (!r.ok) throw new Error(`fixture collaborator: ${r.error}`);
  return r.value.collaborator;
};

if (integrationEnabled()) {
  let handle: PartnersMysqlHandle | null = null;
  let port: PartnersReadPort | null = null;

  before(async () => {
    const opened = await openPartnersMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!opened.ok) throw new Error(`fixture: openPartnersMysql falhou — ${opened.error}`);
    handle = opened.value;

    const built = await buildPartnersReadPort({ connectionString: VALID_CONN });
    if (!built.ok) throw new Error(`fixture: buildPartnersReadPort falhou — ${built.error}`);
    port = built.value;
  });

  after(async () => {
    if (port !== null) await port.close();
    if (handle !== null) await handle.close();
    handle = null;
  });

  beforeEach(async () => {
    if (handle === null) return;
    await handle.db.delete(handle.schema.parSuppliers);
    await handle.db.delete(handle.schema.parFinanciers);
    await handle.db.delete(handle.schema.parCollaborators);
  });

  describe('buildPartnersReadPort (integração)', () => {
    it('getSupplierView: round-trip read com bancário/PIX + updatedAt', async () => {
      if (handle === null || port === null) return;
      const s = aSupplier();
      const saved = await createDrizzleSupplierStore(handle, clock).save(s);
      assert.equal(saved.ok, true);

      const got = await port.getSupplierView(s.id as unknown as string);
      assert.equal(got.ok, true);
      if (got.ok && got.value !== null) {
        assert.equal(got.value.type, 'supplier');
        assert.equal(got.value.name, 'Fornecedor X');
        assert.equal(got.value.document, '11222333000181');
        assert.deepEqual(got.value.bankAccount, {
          bank: '001',
          agency: '0001-2',
          accountNumber: '123456',
          checkDigit: '7',
        });
        assert.deepEqual(got.value.pixKey, { keyType: 'email', key: 'pix@fornecedor.com.br' });
        assert.ok(got.value.updatedAt instanceof Date);
      } else {
        assert.fail('esperava SupplierView, veio null/err');
      }
    });

    it('getFinancierView: round-trip read', async () => {
      if (handle === null || port === null) return;
      const f = aFinancier();
      await createDrizzleFinancierStore(handle, clock).save(f);

      const got = await port.getFinancierView(f.id as unknown as string);
      assert.equal(got.ok, true);
      if (got.ok && got.value !== null) {
        assert.equal(got.value.type, 'financier');
        assert.equal(got.value.document, '11444777000161');
        assert.equal(got.value.corporateName, 'Fundação Bem Comum LTDA');
        assert.ok(got.value.updatedAt instanceof Date);
      } else {
        assert.fail('esperava FinancierView, veio null/err');
      }
    });

    it('getCollaboratorView: round-trip read', async () => {
      if (handle === null || port === null) return;
      const c = aCollaborator();
      await createDrizzleCollaboratorStore(handle, clock).save(c);

      const got = await port.getCollaboratorView(c.id as unknown as string);
      assert.equal(got.ok, true);
      if (got.ok && got.value !== null) {
        assert.equal(got.value.type, 'collaborator');
        assert.equal(got.value.email, 'joao@bemcomum.org');
        assert.ok(got.value.updatedAt instanceof Date);
      } else {
        assert.fail('esperava CollaboratorView, veio null/err');
      }
    });

    it('id inexistente → ok(null) nas três views', async () => {
      if (port === null) return;
      const missing = '00000000-0000-4000-8000-000000000000';

      const s = await port.getSupplierView(missing);
      assert.equal(s.ok && s.value === null, true);
      const f = await port.getFinancierView(missing);
      assert.equal(f.ok && f.value === null, true);
      const c = await port.getCollaboratorView(missing);
      assert.equal(c.ok && c.value === null, true);
    });
  });
}
