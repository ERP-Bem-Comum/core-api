/**
 * PARTNERS-AGGREGATE-CONTRACT-COUNT (PAR-AGG-CONTRACT-COUNT, issue #107) — W0 (RED).
 *
 * DEVE FALHAR: o grid agregado `GET /api/v1/partners` ainda não expõe `contractCount` em cada
 * linha (`PartnerListItem`). GREEN quando o W1 enriquecer a página com `getContractCounts(ids)`
 * (batch já existente em PartnersHttpDeps, #105) e adicionar `contractCount` ao schema/projeção.
 *
 * CA1 — contraparte com N contratos → linha traz `contractCount = N`.
 * CA2 — contraparte sem contratos → `contractCount = 0`.
 * CA3 — valor vem só do read-model (sem módulo contracts montado; ADR-0006).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  partnersHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import {
  SUPPLIER_PERMISSION,
  FINANCIER_PERMISSION,
  COLLABORATOR_PERMISSION,
  ACT_PERMISSION,
} from '#src/modules/partners/public-api/permissions.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const NOW = new Date('2026-01-10T08:00:00.000Z');
const READER_EMAIL = 'leitor.total@example.com';
const ALL_READS = [
  SUPPLIER_PERMISSION.read,
  FINANCIER_PERMISSION.read,
  COLLABORATOR_PERMISSION.read,
  ACT_PERMISSION.read,
];

const u = <T>(r: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!r.ok) throw new Error(`fixture: ${JSON.stringify(r.error)}`);
  return r.value;
};

const seed = () => {
  const supplier = u(
    Supplier.register({
      id: SupplierId.generate(),
      name: 'Alpha',
      email: 'alpha@f.com',
      cnpj: '11.222.333/0001-81',
      corporateName: 'Alpha LTDA',
      fantasyName: 'Alpha',
      serviceCategory: 'INFORMATICA',
      bankAccount: null,
      pixKey: { keyType: 'email', key: 'alpha@f.com' },
      registeredAt: NOW,
    }),
  ).supplier;
  const financier = u(
    Financier.register({
      id: FinancierId.generate(),
      name: 'Beta',
      corporateName: 'Beta LTDA',
      legalRepresentative: 'Rep',
      cnpj: '11.444.777/0001-61',
      telephone: '+5511999998888',
      address: 'Av. Teste, 1',
      registeredAt: NOW,
    }),
  ).financier;
  const collaborator = u(
    Collaborator.register({
      id: CollaboratorId.generate(),
      name: 'Gama',
      email: 'gama@c.org',
      cpf: '111.444.777-35',
      occupationArea: 'PARC',
      role: 'Educador',
      startOfContract: NOW,
      employmentRelationship: 'CLT',
      registeredAt: NOW,
    }),
  ).collaborator;
  const act = u(
    Act.register({
      id: ActId.generate(),
      actNumber: 'ACT-2026-010',
      name: 'Delta',
      email: 'delta@a.org',
      cnpj: '11.222.333/0001-81',
      corporateName: 'Delta Instituição LTDA',
      fantasyName: 'Delta',
      occupationArea: 'PARC',
      legalRepresentative: 'Representante Legal',
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      hasFinancialTransfer: false,
      bankAccount: null,
      pixKey: null,
      registeredAt: NOW,
    }),
  ).act;
  return {
    supplierId: String(supplier.id),
    financierId: String(financier.id),
    collaboratorId: String(collaborator.id),
    actId: String(act.id),
    records: {
      suppliers: [{ supplier, legacyId: null, createdAt: NOW, updatedAt: NOW }],
      financiers: [{ financier, legacyId: null, createdAt: NOW, updatedAt: NOW }],
      collaborators: [{ collaborator, legacyId: null, createdAt: NOW, updatedAt: NOW }],
      acts: [{ act, legacyId: null, createdAt: NOW, updatedAt: NOW }],
    },
  };
};

const makeApp = async (
  records: Record<string, unknown>,
  contractCounts: readonly { contractorRef: string; activeCount: number }[],
) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: READER_EMAIL, password: STRONG, permissions: ALL_READS }] },
  });
  const partnersDeps = await buildPartnersHttpDeps({
    driver: 'memory',
    seed: { ...records, contractCounts },
  });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      {
        plugin: partnersHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
          hasPermission: authDeps.hasPermission,
        }),
        prefix: '/api/v1',
      },
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await partnersDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: READER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

describe('PARTNERS-AGGREGATE-CONTRACT-COUNT — GET /api/v1/partners', () => {
  it('CA1+CA2+CA3: contractCount por contraparte (N / 0) vindo só do read-model', async () => {
    const s = seed();
    // Contagem só para supplier (3) e collaborator (5) — financier e act ficam sem (→ 0).
    const { app, teardown } = await makeApp(s.records, [
      { contractorRef: s.supplierId, activeCount: 3 },
      { contractorRef: s.collaboratorId, activeCount: 5 },
    ]);
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/partners?limit=100',
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const items = (res.json() as { items: readonly Record<string, unknown>[] }).items;
    const byId = (id: string) => items.find((i) => i['id'] === id);

    assert.equal(byId(s.supplierId)?.['contractCount'], 3); // CA1
    assert.equal(byId(s.collaboratorId)?.['contractCount'], 5); // CA1 (valor mágico → CA3)
    assert.equal(byId(s.financierId)?.['contractCount'], 0); // CA2
    assert.equal(byId(s.actId)?.['contractCount'], 0); // CA2
    await teardown();
  });
});
