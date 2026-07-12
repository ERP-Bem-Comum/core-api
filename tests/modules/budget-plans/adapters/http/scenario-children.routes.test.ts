/**
 * BGP-SCENARIO-CHILDREN — W0 (RED) — issue #401.
 *
 * `GET /budget-plans/:id/children` lista os planos-filhos (cenários/versões) de um plano.
 * DEVE FALHAR: a rota ainda não existe (o use case list-scenario-children + a rota HTTP
 * serão criados no W1). CA1 (200 com os filhos) é o RED principal; CA2 (404) e RBAC completam.
 *
 * O repositório já expõe `listChildren(parentId)` (in-memory + drizzle) — falta só o caso de
 * uso + a borda. Filhos são criados via POST /:id/scenery (cenário RASCUNHO, version minor+1).
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
  budgetPlansHttpPlugin,
  buildBudgetPlansHttpDeps,
} from '#src/modules/budget-plans/public-api/http.ts';
import { BUDGET_PLAN_PERMISSION } from '#src/modules/budget-plans/public-api/permissions.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER_EMAIL = 'budget.writer@example.com';
const READER_EMAIL = 'budget.reader@example.com';
const NOPERM_EMAIL = 'sem.permissao@example.com';
const UUID_INEXISTENTE = '00000000-0000-4000-8000-000000000000';
const PROGRAM_ETI_REF = '11111111-1111-4111-8111-111111111111';

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: WRITER_EMAIL,
          password: STRONG,
          permissions: [BUDGET_PLAN_PERMISSION.read, BUDGET_PLAN_PERMISSION.write],
        },
        { email: READER_EMAIL, password: STRONG, permissions: [BUDGET_PLAN_PERMISSION.read] },
        { email: NOPERM_EMAIL, password: STRONG, permissions: [] },
      ],
    },
  });
  const bpDeps = await buildBudgetPlansHttpDeps({
    driver: 'memory',
    seed: {
      programs: [
        {
          ref: PROGRAM_ETI_REF,
          name: 'Ensino em Tempo Integral',
          abbreviation: 'ETI',
          active: true,
        },
      ],
    },
  });
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);
  const app = await buildApp({
    routes: [
      authHttpPlugin(authDeps),
      budgetPlansHttpPlugin(bpDeps, { requireAuth, authorize: authDeps.authorize }),
    ],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await bpDeps.shutdown();
    await authDeps.shutdown();
  };
  return { app, teardown };
};

type App = Awaited<ReturnType<typeof buildApp>>;

const login = async (app: App, email: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const createPlan = async (app: App, token: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans',
    headers: { authorization: `Bearer ${token}` },
    payload: { year: 2026, programRef: PROGRAM_ETI_REF },
  });
  assert.equal(res.statusCode, 201, res.body);
  return (res.json() as { id: string }).id;
};

const createScenery = async (app: App, token: string, planId: string, name: string) => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/scenery`,
    headers: { authorization: `Bearer ${token}` },
    payload: { name },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json() as { id: string; version: string; scenarioName: string };
};

const getChildren = (app: App, token: string, planId: string) =>
  app.inject({
    method: 'GET',
    url: `/api/v2/budget-plans/${planId}/children`,
    headers: { authorization: `Bearer ${token}` },
  });

interface ChildDto {
  id: string;
  version: string;
  scenarioName: string | null;
  status: string;
  totalInCents: number;
}

describe('GET /budget-plans/:id/children (#401 — BGP-SCENARIO-CHILDREN)', () => {
  it('CA1: plano com cenários → 200 lista os filhos (id, version, scenarioName, status, totalInCents)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const planId = await createPlan(app, token);
      const s1 = await createScenery(app, token, planId, 'Otimista');
      const s2 = await createScenery(app, token, planId, 'Pessimista');

      const res = await getChildren(app, token, planId);
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { items: ChildDto[] };
      assert.ok(Array.isArray(body.items), 'items deve ser array');
      assert.equal(body.items.length, 2, `esperava 2 filhos, veio ${body.items.length}`);

      const ids = body.items.map((i) => i.id);
      assert.ok(ids.includes(s1.id) && ids.includes(s2.id), 'os 2 cenários devem estar na lista');

      const child = body.items.find((i) => i.id === s1.id);
      assert.ok(child, 'cenário s1 presente');
      assert.equal(child?.scenarioName, 'Otimista');
      assert.equal(child?.version, '1.1');
      assert.equal(child?.status, 'RASCUNHO');
      assert.equal(typeof child?.totalInCents, 'number');
    } finally {
      await teardown();
    }
  });

  it('CA1: plano sem filhos → 200 lista vazia coerente', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const planId = await createPlan(app, token);
      const res = await getChildren(app, token, planId);
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { items: readonly unknown[] };
      assert.deepEqual(body.items, []);
    } finally {
      await teardown();
    }
  });

  it('CA3: ordenação determinística por versão (1.1, 1.2)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const planId = await createPlan(app, token);
      await createScenery(app, token, planId, 'A');
      await createScenery(app, token, planId, 'B');
      const res = await getChildren(app, token, planId);
      assert.equal(res.statusCode, 200, res.body);
      const versions = (res.json() as { items: { version: string }[] }).items.map((i) => i.version);
      assert.deepEqual(versions, ['1.1', '1.2'], 'filhos ordenados por versão ascendente');
    } finally {
      await teardown();
    }
  });

  it('CA2: :id inexistente → 404 (não 500)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const res = await getChildren(app, token, UUID_INEXISTENTE);
      assert.equal(res.statusCode, 404, res.body);
    } finally {
      await teardown();
    }
  });

  it('CA2: :id malformado → 400 (Zod na borda)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app, WRITER_EMAIL);
      const res = await getChildren(app, token, 'nao-e-uuid');
      assert.equal(res.statusCode, 400, res.body);
    } finally {
      await teardown();
    }
  });

  it('RBAC: sem Authorization → 401', async () => {
    const { app, teardown } = await makeApp();
    try {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/budget-plans/${UUID_INEXISTENTE}/children`,
      });
      assert.equal(res.statusCode, 401);
    } finally {
      await teardown();
    }
  });

  it('RBAC: reader (budget-plan:read) → autorizado (não 403)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const writer = await login(app, WRITER_EMAIL);
      const planId = await createPlan(app, writer);
      const reader = await login(app, READER_EMAIL);
      const res = await getChildren(app, reader, planId);
      assert.equal(res.statusCode, 200, res.body);
    } finally {
      await teardown();
    }
  });

  it('RBAC: sem budget-plan:read → 403', async () => {
    const { app, teardown } = await makeApp();
    try {
      const writer = await login(app, WRITER_EMAIL);
      const planId = await createPlan(app, writer);
      const noperm = await login(app, NOPERM_EMAIL);
      const res = await getChildren(app, noperm, planId);
      assert.equal(res.statusCode, 403, res.body);
    } finally {
      await teardown();
    }
  });
});
