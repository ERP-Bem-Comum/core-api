/**
 * PARTNERS-AGGREGATOR-HTTP — W0 (RED) — GET /api/v1/partners (agregador).
 *
 * DEVE FALHAR: `partnersHttpPlugin` (rota agregadora) ainda não existe na public-api/http.
 * GREEN quando o W1 entregar o plugin + `partner-aggregate-query.ts` + schemas.
 *
 * Cobre: 200 com os 4 tipos; filtro type/search; type inválido → 400; AND das 4 reads
 * (faltando uma → 403); sem sessão → 401.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { buildApp } from '#src/shared/http/app.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
} from '#src/modules/auth/public-api/http.ts';
// RED: `partnersHttpPlugin` ainda não é exportado — W1 cria o agregador.
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
const FULL_EMAIL = 'leitor.total@example.com';
const PARTIAL_EMAIL = 'leitor.parcial@example.com'; // sem act:read
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
    suppliers: [{ supplier, legacyId: null, createdAt: NOW, updatedAt: NOW }],
    financiers: [{ financier, legacyId: null, createdAt: NOW, updatedAt: NOW }],
    collaborators: [{ collaborator, legacyId: null, createdAt: NOW, updatedAt: NOW }],
    acts: [{ act, legacyId: null, createdAt: NOW, updatedAt: NOW }],
  };
};

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        { email: FULL_EMAIL, password: STRONG, permissions: ALL_READS },
        {
          email: PARTIAL_EMAIL,
          password: STRONG,
          permissions: [
            SUPPLIER_PERMISSION.read,
            FINANCIER_PERMISSION.read,
            COLLABORATOR_PERMISSION.read,
          ],
        },
      ],
    },
  });
  const partnersDeps = await buildPartnersHttpDeps({ driver: 'memory', seed: seed() });
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

const login = async (app: Awaited<ReturnType<typeof buildApp>>, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const get = async (app: Awaited<ReturnType<typeof buildApp>>, token: string, query: string) =>
  app.inject({
    method: 'GET',
    url: `/api/v1/partners${query}`,
    headers: { authorization: `Bearer ${token}` },
  });

describe('PARTNERS-AGGREGATOR-HTTP — GET /api/v1/partners', () => {
  it('CA: sem Authorization → 401', async () => {
    const { app, teardown } = await makeApp();
    assert.equal((await app.inject({ method: 'GET', url: '/api/v1/partners' })).statusCode, 401);
    await teardown();
  });

  it('CA: faltando uma das 4 reads (sem act:read) → 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, PARTIAL_EMAIL);
    assert.equal((await get(app, token, '')).statusCode, 403);
    await teardown();
  });

  it('CA: 200 com os 4 tipos (projeção plana) + meta', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, FULL_EMAIL);
    const res = await get(app, token, '');
    assert.equal(res.statusCode, 200);
    const body = res.json() as {
      items: readonly {
        type: string;
        id: string;
        name: string;
        document: string;
        active: boolean;
      }[];
      meta: { totalItems: number; itemsPerPage: number; currentPage: number; totalPages: number };
    };
    assert.equal(body.meta.totalItems, 4);
    assert.deepEqual([...new Set(body.items.map((i) => i.type))].sort(), [
      'act',
      'collaborator',
      'financier',
      'supplier',
    ]);
    await teardown();
  });

  it('CA: ?type=supplier filtra só fornecedores', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, FULL_EMAIL);
    const body = (await get(app, token, '?type=supplier')).json() as {
      items: readonly { type: string }[];
    };
    assert.deepEqual([...new Set(body.items.map((i) => i.type))], ['supplier']);
    await teardown();
  });

  it('CA: ?search=Alpha casa por nome', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, FULL_EMAIL);
    const body = (await get(app, token, '?search=Alpha')).json() as {
      meta: { totalItems: number };
    };
    assert.equal(body.meta.totalItems, 1);
    await teardown();
  });

  it('CA: ?type inválido → 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, FULL_EMAIL);
    assert.equal((await get(app, token, '?type=cliente')).statusCode, 400);
    await teardown();
  });
});
