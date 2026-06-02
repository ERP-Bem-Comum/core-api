/**
 * PARTNERS-ETL-WRITE-PORT — buildPartnersEtlPort (integração) — gated MYSQL_INTEGRATION=1.
 * DEVE FALHAR em W0 (buildPartnersEtlPort inexistente). Roda contra MySQL real (docker).
 * Idempotência por legacy_id das 4 entidades + findByLegacyId. Truncate no beforeEach.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { eq } from 'drizzle-orm';

import {
  buildPartnersEtlPort,
  type PartnersEtlPort,
} from '#src/modules/partners/public-api/etl.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as UserProfile from '#src/modules/partners/domain/user-profile/user-profile.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';

const VALID_CONN = `mysql://root:rootpw-migration-test-only@127.0.0.1:${process.env['MYSQL_PORT'] ?? '3306'}/core`;
const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';
const clock = ClockFixed(new Date('2026-06-02T12:00:00.000Z'));

const aSupplier = (cnpj: string) => {
  const r = Supplier.register({
    id: SupplierId.generate(),
    name: 'Fornecedor X',
    email: 'contato@fornecedor.com.br',
    cnpj,
    corporateName: 'Fornecedor X LTDA',
    fantasyName: 'FX',
    serviceCategory: 'INFORMATICA',
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: null,
    registeredAt: clock.now(),
  });
  if (!r.ok) throw new Error(`fixture supplier: ${r.error}`);
  return r.value.supplier;
};

const aFinancier = (cnpj: string) => {
  const r = Financier.register({
    id: FinancierId.generate(),
    name: 'Fundação Bem Comum',
    corporateName: 'Fundação Bem Comum LTDA',
    legalRepresentative: 'Maria Silva',
    cnpj,
    telephone: '+5511999998888',
    address: 'Av. Paulista, 1000',
    registeredAt: clock.now(),
  });
  if (!r.ok) throw new Error(`fixture financier: ${r.error}`);
  return r.value.financier;
};

const aCollaborator = (cpf: string, email: string) => {
  const r = Collaborator.register({
    id: CollaboratorId.generate(),
    name: 'Maria Silva',
    email,
    cpf,
    occupationArea: 'PARC',
    role: 'Educadora',
    startOfContract: new Date('2025-02-01T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: clock.now(),
  });
  if (!r.ok) throw new Error(`fixture collaborator: ${r.error}`);
  return r.value.collaborator;
};

const aUserProfile = (refRaw: string, cpf: string) => {
  const ref = UserRef.rehydrate(refRaw);
  if (!ref.ok) throw new Error(`fixture ref: ${ref.error}`);
  const r = UserProfile.create({
    userRef: ref.value,
    name: 'Maria Silva',
    cpf,
    telephone: '11999998888',
    avatarUrl: null,
    createdAt: clock.now(),
  });
  if (!r.ok) throw new Error(`fixture profile: ${r.error}`);
  return r.value.profile;
};

if (integrationEnabled()) {
  let handle: PartnersMysqlHandle | null = null;
  let port: PartnersEtlPort | null = null;

  before(async () => {
    const opened = await openPartnersMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!opened.ok) throw new Error(`fixture: openPartnersMysql falhou — ${opened.error}`);
    handle = opened.value;

    const built = await buildPartnersEtlPort({ connectionString: VALID_CONN });
    if (!built.ok) throw new Error(`fixture: buildPartnersEtlPort falhou — ${built.error}`);
    port = built.value;
  });

  after(async () => {
    if (port !== null) await port.close();
    if (handle !== null) await handle.close();
    handle = null;
  });

  beforeEach(async () => {
    if (handle === null) return;
    await handle.db.delete(handle.schema.parUserProfiles);
    await handle.db.delete(handle.schema.parSuppliers);
    await handle.db.delete(handle.schema.parFinanciers);
    await handle.db.delete(handle.schema.parCollaborators);
  });

  describe('buildPartnersEtlPort (integração)', () => {
    it('suppliers: idempotente por legacy_id (2× = 1 linha) + findByLegacyId', async () => {
      if (handle === null || port === null) return;
      const a = aSupplier('11222333000181');

      const first = await port.suppliers.provision(a, 7);
      assert.equal(first.ok && first.value === 'created', true);

      const again = await port.suppliers.provision(aSupplier('11444777000161'), 7);
      assert.equal(again.ok && again.value === 'already-exists', true);

      const found = await port.suppliers.findByLegacyId(7);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value, a.id);

      const rows = await handle.db
        .select({ id: handle.schema.parSuppliers.id })
        .from(handle.schema.parSuppliers)
        .where(eq(handle.schema.parSuppliers.legacyId, 7));
      assert.equal(rows.length, 1);
    });

    it('financiers: idempotente por legacy_id (2× = 1 linha)', async () => {
      if (handle === null || port === null) return;
      await port.financiers.provision(aFinancier('11222333000181'), 3);
      const again = await port.financiers.provision(aFinancier('11444777000161'), 3);
      assert.equal(again.ok && again.value === 'already-exists', true);

      const rows = await handle.db
        .select({ id: handle.schema.parFinanciers.id })
        .from(handle.schema.parFinanciers)
        .where(eq(handle.schema.parFinanciers.legacyId, 3));
      assert.equal(rows.length, 1);
    });

    it('collaborators: idempotente por legacy_id (2× = 1 linha)', async () => {
      if (handle === null || port === null) return;
      await port.collaborators.provision(aCollaborator('111.444.777-35', 'm1@bemcomum.org'), 9);
      const again = await port.collaborators.provision(
        aCollaborator('111.444.777-35', 'm2@bemcomum.org'),
        9,
      );
      assert.equal(again.ok && again.value === 'already-exists', true);

      const rows = await handle.db
        .select({ id: handle.schema.parCollaborators.id })
        .from(handle.schema.parCollaborators)
        .where(eq(handle.schema.parCollaborators.legacyId, 9));
      assert.equal(rows.length, 1);
    });

    it('userProfiles: idempotente por legacy_id + findByLegacyId (PK user_ref)', async () => {
      if (handle === null || port === null) return;
      const p = aUserProfile('7f3a1234-5678-4abc-9def-fedcba987654', '111.444.777-35');

      const first = await port.userProfiles.provision(p, 5);
      assert.equal(first.ok && first.value === 'created', true);

      const again = await port.userProfiles.provision(
        aUserProfile('00000000-0000-4000-8000-000000000000', '111.444.777-35'),
        5,
      );
      assert.equal(again.ok && again.value === 'already-exists', true);

      const found = await port.userProfiles.findByLegacyId(5);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value, p.userRef);

      const rows = await handle.db
        .select({ userRef: handle.schema.parUserProfiles.userRef })
        .from(handle.schema.parUserProfiles)
        .where(eq(handle.schema.parUserProfiles.legacyId, 5));
      assert.equal(rows.length, 1);
    });
  });
}
