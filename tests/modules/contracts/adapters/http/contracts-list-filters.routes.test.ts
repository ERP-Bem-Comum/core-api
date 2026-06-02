/**
 * CTR-HTTP-CONTRACT-LIST-FILTERS — W0 (RED) — GET /contracts com filtros + paginação.
 *
 * DEVE FALHAR: a rota `GET /api/v2/contracts` ainda devolve um array cru (sem `meta`) e
 * não valida query params. GREEN quando o W1 entregar: querystring Zod
 * (page/limit/search/status/order), response `{ items, meta }`, filtragem via use case
 * paginado, e OpenAPI atualizado.
 *
 * Driver memory (sem Docker). Seed de contratos via composition; token com `contract:read`
 * via seed RBAC do auth.
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
  contractsHttpPlugin,
  buildContractsHttpDeps,
} from '#src/modules/contracts/public-api/http.ts';

import { buildContract, buildExpiredContract } from '../persistence/fixtures.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const READER_EMAIL = 'reader@example.com';

const CONTRACTS = [
  buildContract({
    id: 'a1111111-1111-4111-8111-111111111111',
    sequentialNumber: '001/2026',
    title: 'Limpeza predial',
    objective: 'Serviço de limpeza',
  }),
  buildContract({
    id: 'b2222222-2222-4222-8222-222222222222',
    sequentialNumber: '002/2026',
    title: 'Manutenção elétrica',
    objective: 'Reparos',
  }),
  buildContract({
    id: 'c3333333-3333-4333-8333-333333333333',
    sequentialNumber: '003/2026',
    title: 'Consultoria',
    objective: 'Auditoria',
  }),
  buildExpiredContract({
    id: 'd4444444-4444-4444-8444-444444444444',
    sequentialNumber: '004/2026',
    title: 'Obra antiga',
  }),
];

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: { users: [{ email: READER_EMAIL, password: STRONG, permissions: ['contract:read'] }] },
  });
  const contractsDeps = await buildContractsHttpDeps({
    driver: 'memory',
    seed: { contracts: CONTRACTS },
  });
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      contractsHttpPlugin(contractsDeps, {
        requireAuth: makeRequireAuth(authDeps.verifyAccessToken),
        authorize: authDeps.authorize,
      }),
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await contractsDeps.shutdown();
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

const bearer = (token: string): Record<string, string> => ({ authorization: `Bearer ${token}` });

interface PagedBody {
  items: readonly { sequentialNumber: string; status: string }[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

describe('CTR-HTTP-CONTRACT-LIST-FILTERS — GET /api/v2/contracts (paginado)', () => {
  it('CA1: default sem query → 200 com { items, meta } e todos os contratos', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts',
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as PagedBody;
    assert.ok(Array.isArray(body.items), 'items deve ser array');
    assert.equal(body.meta.total, 4);
    assert.equal(body.meta.page, 1);
    assert.equal(body.items.length, 4);
    await teardown();
  });

  it('CA1: ?page=1&limit=2 retorna 2 itens + meta correta', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts?page=1&limit=2',
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as PagedBody;
    assert.equal(body.items.length, 2);
    assert.deepEqual(body.meta, { page: 1, limit: 2, total: 4, totalPages: 2 });
    await teardown();
  });

  it('CA2: ?search= filtra por texto', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts?search=limpeza',
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as PagedBody;
    assert.equal(body.meta.total, 1);
    assert.equal(body.items[0]?.sequentialNumber, '001/2026');
    await teardown();
  });

  it('CA3: ?status=Expired filtra por estado', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts?status=Expired',
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as PagedBody;
    assert.equal(body.meta.total, 1);
    assert.equal(body.items[0]?.status, 'Expired');
    await teardown();
  });

  it('CA4: ?order=DESC inverte a ordem', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts?order=DESC',
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as PagedBody;
    assert.equal(body.items[0]?.sequentialNumber, '004/2026');
    await teardown();
  });

  it('CA5: page=0 → 400 (Zod, page>=1)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts?page=0',
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA5: limit acima do teto → 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts?limit=9999',
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA5: status inválido → 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const res = await app.inject({
      method: 'GET',
      url: '/api/v2/contracts?status=Nope',
      headers: bearer(token),
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA1: sem Authorization → 401 (regressão)', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/api/v2/contracts?page=1' });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA7: /docs/json documenta query params de /api/v2/contracts', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: '/docs/json' });
    const doc = res.json() as {
      paths: Record<string, { get?: { parameters?: readonly { name: string }[] } }>;
    };
    const params = doc.paths['/api/v2/contracts']?.get?.parameters ?? [];
    const names = params.map((p) => p.name);
    assert.ok(names.includes('page'), 'OpenAPI deve documentar query param page');
    assert.ok(names.includes('limit'), 'OpenAPI deve documentar query param limit');
    await teardown();
  });
});
