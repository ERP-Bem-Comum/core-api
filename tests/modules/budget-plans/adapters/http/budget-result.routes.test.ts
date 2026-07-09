/**
 * BDG-BUDGET-CALC (#317) — contrato HTTP dos lançamentos calculados (US3).
 *
 * 4 rotas POST /budget-plans/budget-results/{ipca,caed,personal-expenses,logistics-expenses}:
 *   write -> 201 { id, budgetId, subcategoryId, model, valueInCents }
 *
 * Mapa erro->HTTP (plugin):
 *   calc-model-mismatch     -> 400 (modelo ≠ launchType da subcategoria — CA2)
 *   budget-not-found        -> 404
 *   subcategory-not-found   -> 404
 *   body malformado (Zod)   -> 400
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
const WRITER_EMAIL = 'result.writer@example.com';
const NOPERM_EMAIL = 'result.semperm@example.com';

const BUDGET_ID = '88888888-8888-4888-8888-888888888888';
const SUB_IPCA = '99999999-9999-4999-8999-999999999999';
const SUB_LOG = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MISSING_BUDGET = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const MISSING_SUB = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

const IPCA_URL = '/api/v2/budget-plans/budget-results/ipca';
const CAED_URL = '/api/v2/budget-plans/budget-results/caed';
const LOG_URL = '/api/v2/budget-plans/budget-results/logistics-expenses';

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
      budgetsExisting: [BUDGET_ID],
      subcategoryLaunchTypes: { [SUB_IPCA]: 'IPCA', [SUB_LOG]: 'DESPESAS_LOGISTICAS' },
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

const registerAndLogin = async (app: App, email: string): Promise<string> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  return login(app, email);
};

const ipcaPayload = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  budgetId: BUDGET_ID,
  subcategoryId: SUB_IPCA,
  baseValueInCents: 100000,
  ipca: 4.5,
  ...over,
});

describe('POST /budget-plans/budget-results/ipca', () => {
  it('sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'POST', url: IPCA_URL, payload: ipcaPayload() });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('sem budget-plan:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: IPCA_URL,
      headers: { authorization: `Bearer ${token}` },
      payload: ipcaPayload(),
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA1: IPCA calcula e persiste -> 201 + valueInCents (paridade legado)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: IPCA_URL,
      headers: { authorization: `Bearer ${token}` },
      payload: ipcaPayload(),
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as { model: string; valueInCents: number; budgetId: string };
    assert.equal(body.model, 'IPCA');
    assert.equal(body.valueInCents, 104500);
    assert.equal(body.budgetId, BUDGET_ID);
    await teardown();
  });

  it('CA2: modelo ≠ launchType da subcategoria -> 400 (calc-model-mismatch)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    // SUB_IPCA tem launchType IPCA; postar como CAED diverge.
    const res = await app.inject({
      method: 'POST',
      url: CAED_URL,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        budgetId: BUDGET_ID,
        subcategoryId: SUB_IPCA,
        numberOfEnrollments: 30,
        baseValueInCents: 5000,
      },
    });
    assert.equal(res.statusCode, 400, res.body);
    await teardown();
  });

  it('orçamento inexistente -> 404 (budget-not-found)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: IPCA_URL,
      headers: { authorization: `Bearer ${token}` },
      payload: ipcaPayload({ budgetId: MISSING_BUDGET }),
    });
    assert.equal(res.statusCode, 404, res.body);
    await teardown();
  });

  it('subcategoria inexistente -> 404 (subcategory-not-found)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: IPCA_URL,
      headers: { authorization: `Bearer ${token}` },
      payload: ipcaPayload({ subcategoryId: MISSING_SUB }),
    });
    assert.equal(res.statusCode, 404, res.body);
    await teardown();
  });

  it('body malformado (baseValueInCents negativo) -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: IPCA_URL,
      headers: { authorization: `Bearer ${token}` },
      payload: ipcaPayload({ baseValueInCents: -1 }),
    });
    assert.equal(res.statusCode, 400, res.body);
    await teardown();
  });
});

describe('POST /budget-plans/budget-results/logistics-expenses', () => {
  it('CA1: logística calcula (passagem sem diária; demais × diária) -> 201 + valueInCents', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: LOG_URL,
      headers: { authorization: `Bearer ${token}` },
      payload: {
        budgetId: BUDGET_ID,
        subcategoryId: SUB_LOG,
        numberOfPeople: 2,
        totalTrips: 3,
        airfareInCents: 50000,
        dailyAccommodation: 4,
        accommodationInCents: 15000,
        dailyFood: 4,
        foodInCents: 5000,
        dailyTransport: 4,
        transportInCents: 3000,
        dailyCarAndFuel: 2,
        carAndFuelInCents: 10000,
      },
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as { model: string; valueInCents: number };
    assert.equal(body.model, 'DESPESAS_LOGISTICAS');
    assert.equal(body.valueInCents, 972000);
    await teardown();
  });
});

const byBudgetUrl = (budgetId: string): string =>
  `/api/v2/budget-plans/budget-results/by-budget/${budgetId}`;

describe('GET /budget-plans/budget-results/by-budget/:budgetId', () => {
  it('sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: byBudgetUrl(BUDGET_ID) });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('CA3: lista os lançamentos do orçamento + soma (totalInCents)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    await app.inject({
      method: 'POST',
      url: IPCA_URL,
      headers: { authorization: `Bearer ${token}` },
      payload: ipcaPayload(),
    });
    const res = await app.inject({
      method: 'GET',
      url: byBudgetUrl(BUDGET_ID),
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: { valueInCents: number }[]; totalInCents: number };
    assert.equal(body.items.length, 1);
    assert.equal(body.items[0]?.valueInCents, 104500);
    assert.equal(body.totalInCents, 104500);
    await teardown();
  });

  it('orçamento sem lançamentos -> 200 + lista vazia', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: byBudgetUrl(BUDGET_ID),
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: unknown[]; totalInCents: number };
    assert.equal(body.items.length, 0);
    assert.equal(body.totalInCents, 0);
    await teardown();
  });
});
