/**
 * PARTNERS-ETL-STORE-INTEGRITY-ERROR (Achado 2) — W0 RED (integracao) — gated MYSQL_INTEGRATION=1.
 *
 * Espelha partners-etl-port.integration.test.ts. Prova end-to-end contra MySQL real (docker) que
 * duas entidades DISTINTAS com o MESMO cnpj/cpf (legacy_id diferentes) violam uma UNIQUE
 * SECUNDARIA e o store retorna err('partners-etl-store-integrity-violation') — NAO
 * 'partners-etl-store-unavailable' (hoje: mascarado como infra) NEM 'already-exists'.
 *
 * DEVE FALHAR em W0: o variante 'partners-etl-store-integrity-violation' ainda nao existe e o
 * comportamento atual classifica o 1062-em-cnpj_idx como 'partners-etl-store-unavailable'.
 *
 * Rodar via: pnpm run test:integration:partners (W0 espera RED; Docker OFF -> suite skipa, ok).
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

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
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

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

  describe('store ETL: violacao de UNIQUE secundaria -> integrity-violation', () => {
    it('suppliers: mesmo CNPJ com legacy_id distintos -> integrity-violation (NAO unavailable/already-exists)', async () => {
      if (port === null) return;
      const cnpj = '11222333000181';

      // legacy_id 100 cria a linha
      const first = await port.suppliers.provision(aSupplier(cnpj), 100);
      assert.equal(first.ok && first.value === 'created', true);

      // legacy_id 200 (distinto) com o MESMO cnpj -> colide em par_suppliers_cnpj_idx
      const second = await port.suppliers.provision(aSupplier(cnpj), 200);
      assert.equal(second.ok, false);
      if (!second.ok) {
        assert.equal(second.error, 'partners-etl-store-integrity-violation');
      }
    });

    it('collaborators: mesmo CPF com legacy_id distintos -> integrity-violation', async () => {
      if (port === null) return;
      const cpf = '111.444.777-35';

      const first = await port.collaborators.provision(aCollaborator(cpf, 'm1@bemcomum.org'), 100);
      assert.equal(first.ok && first.value === 'created', true);

      // legacy_id distinto, CPF igual, email diferente -> colide em par_collaborators_cpf_idx
      const second = await port.collaborators.provision(aCollaborator(cpf, 'm2@bemcomum.org'), 200);
      assert.equal(second.ok, false);
      if (!second.ok) {
        assert.equal(second.error, 'partners-etl-store-integrity-violation');
      }
    });

    it('mesmo legacy_id (re-run) continua already-exists — idempotencia preservada', async () => {
      if (port === null) return;
      const first = await port.suppliers.provision(aSupplier('11222333000181'), 300);
      assert.equal(first.ok && first.value === 'created', true);

      // MESMO legacy_id -> colide em par_suppliers_legacy_id_idx -> idempotente
      const again = await port.suppliers.provision(aSupplier('11444777000161'), 300);
      assert.equal(again.ok && again.value === 'already-exists', true);
    });
  });
}
