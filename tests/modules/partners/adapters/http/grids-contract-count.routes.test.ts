/**
 * GRIDS-CONTRACT-COUNT (PAR-GRID-CONTRACT-COUNT, issue #105) — W0 (RED).
 *
 * DEVE FALHAR: os grids de contraparte do partners ainda não expõem `contractCount`. O read-model
 * `par_contract_count_view` (US6b) está pronto e populado pela projeção, mas nenhum DTO/handler o
 * lê. GREEN quando o W1 injetar o `ContractCountStore` no composition (`seed.contractCounts` no
 * driver memory) e enriquecer cada linha de grid com `contractCount` (default 0).
 *
 * CA1 — contractor com N contratos → linha traz `contractCount = N`.
 * CA2 — contractor sem contratos (ausente no read-model) → `contractCount = 0` (nunca null/ausente).
 * CA3 — a contagem vem SÓ do read-model: o app de teste não monta o módulo `contracts` e o valor
 *       exibido é exatamente o semeado em `contractCounts` (ADR-0006: partners nunca consulta contracts).
 *
 * Driver memory. `seed.contractCounts: [{ contractorRef, activeCount }]` é a API de seed que o W1 entrega.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { FastifyPluginAsync } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
import {
  collaboratorsHttpPlugin,
  suppliersHttpPlugin,
  financiersHttpPlugin,
  actHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';
import {
  COLLABORATOR_PERMISSION,
  SUPPLIER_PERMISSION,
  FINANCIER_PERMISSION,
  ACT_PERMISSION,
} from '#src/modules/partners/public-api/permissions.ts';
import type { CollaboratorReadRecord } from '#src/modules/partners/application/ports/collaborator-reader.ts';
import type { SupplierReadRecord } from '#src/modules/partners/application/ports/supplier-reader.ts';
import type { FinancierReadRecord } from '#src/modules/partners/application/ports/financier-reader.ts';
import type { ActReadRecord } from '#src/modules/partners/application/ports/act-reader.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Supplier from '#src/modules/partners/domain/supplier/supplier.ts';
import * as SupplierId from '#src/modules/partners/domain/supplier/supplier-id.ts';
import * as Financier from '#src/modules/partners/domain/financier/financier.ts';
import * as FinancierId from '#src/modules/partners/domain/financier/financier-id.ts';
import * as Act from '#src/modules/partners/domain/act/act.ts';
import * as ActId from '#src/modules/partners/domain/act/act-id.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const NOW = new Date('2026-01-10T08:00:00.000Z');

type Seeded = Readonly<{ id: string; record: unknown }>;

const mkCollaborator = (name: string, cpf: string): Seeded => {
  const id = CollaboratorId.generate();
  const r = Collaborator.register({
    id,
    name,
    email: `${name.toLowerCase()}@bemcomum.org`,
    cpf,
    occupationArea: 'PARC',
    role: 'Analista',
    startOfContract: new Date('2026-01-10T00:00:00.000Z'),
    employmentRelationship: 'CLT',
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture collaborator: ${r.ok ? '' : r.error}`);
  const record: CollaboratorReadRecord = {
    collaborator: r.value.collaborator,
    legacyId: 1,
    createdAt: NOW,
    updatedAt: NOW,
  };
  return { id: String(id), record };
};

const mkSupplier = (name: string, cnpj: string): Seeded => {
  const id = SupplierId.generate();
  const r = Supplier.register({
    id,
    name,
    email: `${name.toLowerCase()}@fornecedor.com.br`,
    cnpj,
    corporateName: `${name} LTDA`,
    fantasyName: name,
    serviceCategory: 'INFORMATICA',
    bankAccount: { bank: '001', agency: '0001-2', accountNumber: '123456', checkDigit: '7' },
    pixKey: null,
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture supplier: ${r.ok ? '' : r.error}`);
  const record: SupplierReadRecord = {
    supplier: r.value.supplier,
    legacyId: 1,
    createdAt: NOW,
    updatedAt: NOW,
  };
  return { id: String(id), record };
};

const mkFinancier = (name: string, cnpj: string): Seeded => {
  const id = FinancierId.generate();
  const r = Financier.register({
    id,
    name,
    corporateName: `${name} S.A.`,
    legalRepresentative: 'Maria Diretora',
    cnpj,
    telephone: '+5511999998888',
    address: 'Av. Central, 1000',
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture financier: ${r.ok ? '' : r.error}`);
  const record: FinancierReadRecord = {
    financier: r.value.financier,
    legacyId: 7,
    createdAt: NOW,
    updatedAt: NOW,
  };
  return { id: String(id), record };
};

const mkAct = (actNumber: string, name: string, cnpj: string): Seeded => {
  const id = ActId.generate();
  const r = Act.register({
    id,
    actNumber,
    name,
    email: 'contato@instituicao.org',
    cnpj,
    corporateName: `${name} LTDA`,
    fantasyName: 'IP',
    occupationArea: 'PARC',
    legalRepresentative: 'João Diretor',
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    hasFinancialTransfer: false,
    bankAccount: null,
    pixKey: null,
    registeredAt: NOW,
  });
  assert.ok(r.ok, `fixture act: ${r.ok ? '' : r.error}`);
  const record: ActReadRecord = { act: r.value.act, legacyId: 5, createdAt: NOW, updatedAt: NOW };
  return { id: String(id), record };
};

type AuthBits = Readonly<{
  requireAuth: ReturnType<typeof makeRequireAuth>;
  authorize: Awaited<ReturnType<typeof buildAuthHttpDeps>>['authorize'];
  hasPermission: Awaited<ReturnType<typeof buildAuthHttpDeps>>['hasPermission'];
}>;

const makeApp = async (opts: {
  email: string;
  permission: string;
  seed: Record<string, unknown>;
  plugin: (
    deps: Awaited<ReturnType<typeof buildPartnersHttpDeps>>,
    auth: AuthBits,
  ) => FastifyPluginAsync;
}) => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: opts.email, password: STRONG, permissions: [opts.permission] }] },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory', seed: opts.seed });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const auth: AuthBits = {
    requireAuth,
    authorize: authDeps.authorize,
    hasPermission: authDeps.hasPermission,
  };
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      { plugin: opts.plugin(partnersDeps, auth), prefix: '/api/v1' },
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await partnersDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

const login = async (app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const listRows = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  path: string,
): Promise<readonly Record<string, unknown>[]> => {
  const res = await app.inject({
    method: 'GET',
    url: `${path}?limit=50`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  return (res.json() as { items: readonly Record<string, unknown>[] }).items;
};

const getDetail = async (
  app: Awaited<ReturnType<typeof buildApp>>,
  token: string,
  path: string,
  id: string,
): Promise<Record<string, unknown>> => {
  const res = await app.inject({
    method: 'GET',
    url: `${path}/${id}`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200);
  return res.json() as Record<string, unknown>;
};

describe('GRIDS-CONTRACT-COUNT — GET /api/v1/collaborators', () => {
  it('CA1+CA2: contractCount = N na linha semeada; = 0 na linha sem contratos', async () => {
    const withN = mkCollaborator('Ana', '11144477735');
    const zero = mkCollaborator('Bruno', '52998224725');
    const email = 'rh.leitor@example.com';
    const { app, teardown } = await makeApp({
      email,
      permission: COLLABORATOR_PERMISSION.read,
      seed: {
        collaborators: [withN.record, zero.record],
        contractCounts: [{ contractorRef: withN.id, activeCount: 3 }],
      },
      plugin: (d, a) => collaboratorsHttpPlugin(d, a),
    });
    const token = await login(app, email);
    const rows = await listRows(app, token, '/api/v1/collaborators');
    const rowN = rows.find((r) => r['id'] === withN.id);
    const row0 = rows.find((r) => r['id'] === zero.id);
    assert.ok(rowN, 'linha com contagem presente');
    assert.ok(row0, 'linha sem contagem presente');
    assert.equal(rowN['contractCount'], 3); // CA1
    assert.equal(row0['contractCount'], 0); // CA2
    await teardown();
  });

  it('CA3: o valor exibido vem apenas do read-model (sem módulo contracts montado)', async () => {
    const c = mkCollaborator('Carla', '39053344705');
    const email = 'rh.leitor@example.com';
    const { app, teardown } = await makeApp({
      email,
      permission: COLLABORATOR_PERMISSION.read,
      // 7 não deriva de nenhum contrato real (não existem) — só do read-model semeado.
      seed: {
        collaborators: [c.record],
        contractCounts: [{ contractorRef: c.id, activeCount: 7 }],
      },
      plugin: (d, a) => collaboratorsHttpPlugin(d, a),
    });
    const token = await login(app, email);
    const rows = await listRows(app, token, '/api/v1/collaborators');
    const row = rows.find((r) => r['id'] === c.id);
    assert.ok(row);
    assert.equal(row['contractCount'], 7);
    await teardown();
  });

  it('detalhe: GET /:id traz contractCount do read-model', async () => {
    const c = mkCollaborator('Diego', '11144477735');
    const email = 'rh.leitor@example.com';
    const { app, teardown } = await makeApp({
      email,
      permission: COLLABORATOR_PERMISSION.read,
      seed: {
        collaborators: [c.record],
        contractCounts: [{ contractorRef: c.id, activeCount: 6 }],
      },
      plugin: (d, a) => collaboratorsHttpPlugin(d, a),
    });
    const token = await login(app, email);
    const dto = await getDetail(app, token, '/api/v1/collaborators', c.id);
    assert.equal(dto['contractCount'], 6);
    await teardown();
  });
});

describe('GRIDS-CONTRACT-COUNT — GET /api/v1/suppliers', () => {
  it('CA1+CA2: contractCount = N na linha semeada; = 0 na linha sem contratos', async () => {
    const withN = mkSupplier('Alpha', '11.222.333/0001-81');
    const zero = mkSupplier('Beta', '11.444.777/0001-61');
    const email = 'compras.leitor@example.com';
    const { app, teardown } = await makeApp({
      email,
      permission: SUPPLIER_PERMISSION.read,
      seed: {
        suppliers: [withN.record, zero.record],
        contractCounts: [{ contractorRef: withN.id, activeCount: 2 }],
      },
      plugin: (d, a) => suppliersHttpPlugin(d, a),
    });
    const token = await login(app, email);
    const rows = await listRows(app, token, '/api/v1/suppliers');
    const rowN = rows.find((r) => r['id'] === withN.id);
    const row0 = rows.find((r) => r['id'] === zero.id);
    assert.ok(rowN, 'linha com contagem presente');
    assert.ok(row0, 'linha sem contagem presente');
    assert.equal(rowN['contractCount'], 2); // CA1
    assert.equal(row0['contractCount'], 0); // CA2
    await teardown();
  });

  it('CA3: o valor exibido vem apenas do read-model (sem módulo contracts montado)', async () => {
    const s = mkSupplier('Gamma', '11.222.333/0001-81');
    const email = 'compras.leitor@example.com';
    const { app, teardown } = await makeApp({
      email,
      permission: SUPPLIER_PERMISSION.read,
      seed: { suppliers: [s.record], contractCounts: [{ contractorRef: s.id, activeCount: 9 }] },
      plugin: (d, a) => suppliersHttpPlugin(d, a),
    });
    const token = await login(app, email);
    const row = (await listRows(app, token, '/api/v1/suppliers')).find((r) => r['id'] === s.id);
    assert.ok(row);
    assert.equal(row['contractCount'], 9);
    await teardown();
  });

  it('detalhe: GET /:id traz contractCount do read-model', async () => {
    const s = mkSupplier('Delta', '11.222.333/0001-81');
    const email = 'compras.leitor@example.com';
    const { app, teardown } = await makeApp({
      email,
      permission: SUPPLIER_PERMISSION.read,
      seed: { suppliers: [s.record], contractCounts: [{ contractorRef: s.id, activeCount: 8 }] },
      plugin: (d, a) => suppliersHttpPlugin(d, a),
    });
    const token = await login(app, email);
    const dto = await getDetail(app, token, '/api/v1/suppliers', s.id);
    assert.equal(dto['contractCount'], 8);
    await teardown();
  });
});

describe('GRIDS-CONTRACT-COUNT — GET /api/v1/financiers', () => {
  it('CA1+CA2: contractCount = N na linha semeada; = 0 na linha sem contratos', async () => {
    const withN = mkFinancier('Banco Apoio', '11222333000181');
    const zero = mkFinancier('Banco Beta', '11444777000161');
    const email = 'fin.leitor@example.com';
    const { app, teardown } = await makeApp({
      email,
      permission: FINANCIER_PERMISSION.read,
      seed: {
        financiers: [withN.record, zero.record],
        contractCounts: [{ contractorRef: withN.id, activeCount: 5 }],
      },
      plugin: (d, a) => financiersHttpPlugin(d, a),
    });
    const token = await login(app, email);
    const rows = await listRows(app, token, '/api/v1/financiers');
    const rowN = rows.find((r) => r['id'] === withN.id);
    const row0 = rows.find((r) => r['id'] === zero.id);
    assert.ok(rowN, 'linha com contagem presente');
    assert.ok(row0, 'linha sem contagem presente');
    assert.equal(rowN['contractCount'], 5); // CA1
    assert.equal(row0['contractCount'], 0); // CA2
    await teardown();
  });

  it('CA3: o valor exibido vem apenas do read-model (sem módulo contracts montado)', async () => {
    const f = mkFinancier('Banco Gama', '11222333000181');
    const email = 'fin.leitor@example.com';
    const { app, teardown } = await makeApp({
      email,
      permission: FINANCIER_PERMISSION.read,
      seed: { financiers: [f.record], contractCounts: [{ contractorRef: f.id, activeCount: 11 }] },
      plugin: (d, a) => financiersHttpPlugin(d, a),
    });
    const token = await login(app, email);
    const row = (await listRows(app, token, '/api/v1/financiers')).find((r) => r['id'] === f.id);
    assert.ok(row);
    assert.equal(row['contractCount'], 11);
    await teardown();
  });

  it('detalhe: GET /:id traz contractCount do read-model', async () => {
    const f = mkFinancier('Banco Delta', '11222333000181');
    const email = 'fin.leitor@example.com';
    const { app, teardown } = await makeApp({
      email,
      permission: FINANCIER_PERMISSION.read,
      seed: { financiers: [f.record], contractCounts: [{ contractorRef: f.id, activeCount: 10 }] },
      plugin: (d, a) => financiersHttpPlugin(d, a),
    });
    const token = await login(app, email);
    const dto = await getDetail(app, token, '/api/v1/financiers', f.id);
    assert.equal(dto['contractCount'], 10);
    await teardown();
  });
});

describe('GRIDS-CONTRACT-COUNT — GET /api/v1/acts', () => {
  it('CA1+CA2: contractCount = N na linha semeada; = 0 na linha sem contratos', async () => {
    const withN = mkAct('ACT-2026-001', 'Acordo X', '11222333000181');
    const zero = mkAct('ACT-2026-002', 'Acordo Y', '11444777000161');
    const email = 'act.reader@example.com';
    const { app, teardown } = await makeApp({
      email,
      permission: ACT_PERMISSION.read,
      seed: {
        acts: [withN.record, zero.record],
        contractCounts: [{ contractorRef: withN.id, activeCount: 4 }],
      },
      plugin: (d, a) => actHttpPlugin(d, { requireAuth: a.requireAuth, authorize: a.authorize }),
    });
    const token = await login(app, email);
    const rows = await listRows(app, token, '/api/v1/acts');
    const rowN = rows.find((r) => r['id'] === withN.id);
    const row0 = rows.find((r) => r['id'] === zero.id);
    assert.ok(rowN, 'linha com contagem presente');
    assert.ok(row0, 'linha sem contagem presente');
    assert.equal(rowN['contractCount'], 4); // CA1
    assert.equal(row0['contractCount'], 0); // CA2
    await teardown();
  });

  it('CA3: o valor exibido vem apenas do read-model (sem módulo contracts montado)', async () => {
    const a = mkAct('ACT-2026-003', 'Acordo Z', '11222333000181');
    const email = 'act.reader@example.com';
    const { app, teardown } = await makeApp({
      email,
      permission: ACT_PERMISSION.read,
      seed: { acts: [a.record], contractCounts: [{ contractorRef: a.id, activeCount: 12 }] },
      plugin: (d, au) => actHttpPlugin(d, { requireAuth: au.requireAuth, authorize: au.authorize }),
    });
    const token = await login(app, email);
    const row = (await listRows(app, token, '/api/v1/acts')).find((r) => r['id'] === a.id);
    assert.ok(row);
    assert.equal(row['contractCount'], 12);
    await teardown();
  });

  it('detalhe: GET /:id traz contractCount do read-model', async () => {
    const a = mkAct('ACT-2026-004', 'Acordo W', '11222333000181');
    const email = 'act.reader@example.com';
    const { app, teardown } = await makeApp({
      email,
      permission: ACT_PERMISSION.read,
      seed: { acts: [a.record], contractCounts: [{ contractorRef: a.id, activeCount: 13 }] },
      plugin: (d, au) => actHttpPlugin(d, { requireAuth: au.requireAuth, authorize: au.authorize }),
    });
    const token = await login(app, email);
    const dto = await getDetail(app, token, '/api/v1/acts', a.id);
    assert.equal(dto['contractCount'], 13);
    await teardown();
  });
});
