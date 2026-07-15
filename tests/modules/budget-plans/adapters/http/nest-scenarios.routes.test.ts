/**
 * BGP-LIST-NEST-SCENARIOS — W0 (RED) — issue #423.
 *
 * `GET /budget-plans` passa a:
 *   (a) expor SEMPRE `parentId` + `scenarioName` no item (raiz/calibração=null; cenário=UUID/string);
 *   (b) aceitar o filtro OPCIONAL `?rootsOnly=true` (retrocompatível), que traz só os planos
 *       com `parent_id IS NULL` (cenários/filhos fora). Sem o param (ou `false`) = lista completa flat.
 *
 * DEVE FALHAR (RED): hoje o `toItem`/schema não projetam parentId/scenarioName (item vem sem esses
 * campos) e o querystring não conhece `rootsOnly` (chave desconhecida é descartada -> a lista não
 * filtra e `rootsOnly` inválido devolve 200 em vez de 400). Molde: item-projections.routes.test.ts
 * (#372) + scenario-children.routes.test.ts (#401).
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

const login = async (app: App): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER_EMAIL, password: STRONG },
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

const createScenery = async (
  app: App,
  token: string,
  planId: string,
  name: string,
): Promise<{ id: string; scenarioName: string }> => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/scenery`,
    headers: { authorization: `Bearer ${token}` },
    payload: { name },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json() as { id: string; scenarioName: string };
};

const list = (app: App, token: string, query = '') =>
  app.inject({
    method: 'GET',
    url: `/api/v2/budget-plans${query}`,
    headers: { authorization: `Bearer ${token}` },
  });

interface ListItem {
  id: string;
  parentId: string | null;
  scenarioName: string | null;
}

describe('GET /budget-plans — aninhar cenários (#423 — BGP-LIST-NEST-SCENARIOS)', () => {
  it('CA2: cada item SEMPRE expõe parentId/scenarioName (raiz null/null; cenário UUID/string)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const rootId = await createPlan(app, token);
      const scenery = await createScenery(app, token, rootId, 'Otimista');

      const res = await list(app, token);
      assert.equal(res.statusCode, 200, res.body);
      const items = (res.json() as { items: ListItem[] }).items;

      const rootItem = items.find((i) => i.id === rootId);
      assert.ok(rootItem, 'raiz deve estar na lista');
      assert.equal(rootItem.parentId, null, 'raiz: parentId null');
      assert.equal(rootItem.scenarioName, null, 'raiz: scenarioName null');

      const scenItem = items.find((i) => i.id === scenery.id);
      assert.ok(scenItem, 'cenário deve estar na lista');
      assert.equal(scenItem.parentId, rootId, 'cenário: parentId = id da raiz');
      assert.equal(scenItem.scenarioName, 'Otimista', 'cenário: scenarioName = nome dado');
    } finally {
      await teardown();
    }
  });

  it('CA2: campos são aditivos — os legados continuam presentes, os novos entram', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      await createPlan(app, token);

      const res = await list(app, token);
      assert.equal(res.statusCode, 200, res.body);
      const item = (res.json() as { items: Record<string, unknown>[] }).items[0];
      assert.ok(item, 'esperava ao menos 1 item');
      for (const k of [
        'id',
        'year',
        'status',
        'version',
        'programName',
        'totalInCents',
        'updatedAt',
        'updatedByRef',
        'partnersCount',
        'networkKind',
      ]) {
        assert.ok(k in item, `campo legado ${k} deve continuar no item`);
      }
      assert.ok(
        'parentId' in item && 'scenarioName' in item,
        'campos novos (parentId/scenarioName) presentes',
      );
    } finally {
      await teardown();
    }
  });

  it('CA3: ?rootsOnly=true retorna só planos raiz (cenário fora)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const rootId = await createPlan(app, token);
      const scenery = await createScenery(app, token, rootId, 'Otimista');

      const res = await list(app, token, '?rootsOnly=true');
      assert.equal(res.statusCode, 200, res.body);
      const items = (res.json() as { items: ListItem[] }).items;

      assert.equal(items.length, 1, 'só a raiz');
      assert.equal(items[0]?.id, rootId, 'item retornado é a raiz');
      assert.equal(items[0]?.parentId, null, 'raiz tem parentId null');
      assert.ok(
        !items.some((i) => i.id === scenery.id),
        'o cenário NÃO pode aparecer com rootsOnly=true',
      );
    } finally {
      await teardown();
    }
  });

  it('CA1: sem param (e rootsOnly=false) retorna tudo — raiz + cenário (não-regressão)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const rootId = await createPlan(app, token);
      const scenery = await createScenery(app, token, rootId, 'Otimista');

      const semParam = await list(app, token);
      assert.equal(semParam.statusCode, 200, semParam.body);
      const idsSem = (semParam.json() as { items: ListItem[] }).items.map((i) => i.id);
      assert.equal(idsSem.length, 2, 'sem param: lista completa flat (raiz + cenário)');
      assert.ok(idsSem.includes(rootId) && idsSem.includes(scenery.id));

      const falseParam = await list(app, token, '?rootsOnly=false');
      assert.equal(falseParam.statusCode, 200, falseParam.body);
      const idsFalse = (falseParam.json() as { items: ListItem[] }).items.map((i) => i.id);
      assert.equal(idsFalse.length, 2, 'rootsOnly=false: idêntico a sem param');
    } finally {
      await teardown();
    }
  });

  it('CA4: rootsOnly não-booleano → 400 (Zod na borda)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const res = await list(app, token, '?rootsOnly=banana');
      assert.equal(res.statusCode, 400, res.body);
    } finally {
      await teardown();
    }
  });
});
