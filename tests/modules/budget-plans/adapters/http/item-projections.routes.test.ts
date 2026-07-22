/**
 * BGP-ITEM-PROJECTIONS — W0 (RED) — issue #372.
 *
 * O item de `GET /budget-plans` deve projetar 2 campos já presentes no agregado (via plan.budgets[]):
 *   - partnersCount: number  (= plan.budgets.length)
 *   - networkKind: 'state' | 'municipality' | 'mixed' | null  (de plan.budgets[].partner.kind)
 *
 * Regra networkKind: só state → 'state'; só municipality → 'municipality'; ambos → 'mixed'; sem budgets → null.
 * DEVE FALHAR: hoje o toItem descarta os budgets e o schema não tem esses campos.
 * (#373 updatedByRef foi SEPARADO — exige migration + captura do ator, não é projeção.)
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
const STATE_CE = 'CE';
const STATE_SP = 'SP';
const MUN_FORTALEZA = '2304400';

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
      partnerStates: [
        { ref: STATE_CE, name: 'Ceará', uf: 'CE' },
        { ref: STATE_SP, name: 'São Paulo', uf: 'SP' },
      ],
      partnerMunicipalities: [{ ref: MUN_FORTALEZA, name: 'Fortaleza', uf: 'CE' }],
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

const addBudget = async (
  app: App,
  token: string,
  planId: string,
  partnerKind: 'state' | 'municipality',
  partnerRef: string,
): Promise<void> => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/budgets`,
    headers: { authorization: `Bearer ${token}` },
    payload: { partnerKind, partnerRef, valueInCents: 500000 },
  });
  assert.equal(res.statusCode, 201, res.body);
};

interface ListItem {
  id: string;
  partnersCount: number;
  networkKind: 'state' | 'municipality' | 'mixed' | null;
}

const firstItem = async (app: App, token: string): Promise<ListItem> => {
  const res = await app.inject({
    method: 'GET',
    url: '/api/v2/budget-plans',
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200, res.body);
  const body = res.json() as { items: ListItem[] };
  const item = body.items[0];
  assert.ok(item, 'esperava ao menos 1 item na lista');
  return item;
};

describe('GET /budget-plans — projeções de item (#372 — BGP-ITEM-PROJECTIONS)', () => {
  it('CA1: plano sem budgets → partnersCount 0, networkKind null', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      await createPlan(app, token);
      const item = await firstItem(app, token);
      assert.equal(item.partnersCount, 0);
      assert.equal(item.networkKind, null);
    } finally {
      await teardown();
    }
  });

  it('CA1/CA2: 2 budgets state (CE+SP) → partnersCount 2, networkKind "state"', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      await addBudget(app, token, planId, 'state', STATE_CE);
      await addBudget(app, token, planId, 'state', STATE_SP);
      const item = await firstItem(app, token);
      assert.equal(item.partnersCount, 2);
      assert.equal(item.networkKind, 'state');
    } finally {
      await teardown();
    }
  });

  it('CA2: só municipality → networkKind "municipality"', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      await addBudget(app, token, planId, 'municipality', MUN_FORTALEZA);
      const item = await firstItem(app, token);
      assert.equal(item.partnersCount, 1);
      assert.equal(item.networkKind, 'municipality');
    } finally {
      await teardown();
    }
  });

  it('CA2: state + municipality → networkKind "mixed"', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      await addBudget(app, token, planId, 'state', STATE_CE);
      await addBudget(app, token, planId, 'municipality', MUN_FORTALEZA);
      const item = await firstItem(app, token);
      assert.equal(item.partnersCount, 2);
      assert.equal(item.networkKind, 'mixed');
    } finally {
      await teardown();
    }
  });

  it('CA3: campos são aditivos — os do item antigo continuam presentes', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      await createPlan(app, token);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/budget-plans',
        headers: { authorization: `Bearer ${token}` },
      });
      const item = (res.json() as { items: Record<string, unknown>[] }).items[0];
      assert.ok(item);
      for (const k of [
        'id',
        'year',
        'status',
        'version',
        'programName',
        'totalInCents',
        'updatedAt',
      ]) {
        assert.ok(k in item, `campo legado ${k} deve continuar no item`);
      }
      assert.ok('partnersCount' in item && 'networkKind' in item, 'campos novos presentes');
    } finally {
      await teardown();
    }
  });
});
