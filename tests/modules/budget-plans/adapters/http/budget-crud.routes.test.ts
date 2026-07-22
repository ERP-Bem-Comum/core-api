/**
 * BDG-BUDGET-CALC (#317) — contrato HTTP do budget CRUD (parte 1/US3 + CA4).
 *   POST   /budget-plans/:id/budgets            write -> 201 { id, partnerKind, partnerRef, valueInCents }
 *   DELETE /budget-plans/:id/budgets/:budgetId  write -> 204 (remove orçamento + resultados — CA4)
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

const PROGRAM_ETI = '11111111-1111-4111-8111-111111111111';
const STATE_REF = 'CE';
const MISSING_BUDGET = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

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
        { ref: PROGRAM_ETI, name: 'Ensino em Tempo Integral', abbreviation: 'ETI', active: true },
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

const registerAndLogin = async (app: App, email: string): Promise<string> => {
  await app.inject({
    method: 'POST',
    url: '/api/v2/auth/register',
    payload: { email, password: STRONG },
  });
  return login(app, email);
};

const createPlan = async (app: App, token: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans',
    headers: { authorization: `Bearer ${token}` },
    payload: { year: 2026, programRef: PROGRAM_ETI },
  });
  assert.equal(res.statusCode, 201, `criar plano falhou: ${res.body}`);
  return (res.json() as { id: string }).id;
};

const addBudget = async (app: App, token: string, planId: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/budgets`,
    headers: { authorization: `Bearer ${token}` },
    payload: { partnerKind: 'state', partnerRef: STATE_REF, valueInCents: 500000 },
  });
  assert.equal(res.statusCode, 201, `add budget falhou: ${res.body}`);
  return (res.json() as { id: string }).id;
};

describe('POST /budget-plans/:id/budgets', () => {
  it('sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/budget-plans/${PROGRAM_ETI}/budgets`,
      payload: { partnerKind: 'state', partnerRef: STATE_REF, valueInCents: 1 },
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('parte 1: adiciona orçamento por Rede -> 201 (criar = plano + Rede)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const planId = await createPlan(app, token);
    // #458 — o body não carrega mais valueInCents; um valor extra é ignorado (strip do Zod).
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/budget-plans/${planId}/budgets`,
      headers: { authorization: `Bearer ${token}` },
      payload: { partnerKind: 'state', partnerRef: STATE_REF },
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as { partner: { kind: string }; valueInCents: number };
    assert.equal(body.partner.kind, 'state');
    // #458 — valueInCents é DERIVADO dos lançamentos; orçamento recém-criado não tem nenhum → 0.
    assert.equal(body.valueInCents, 0);
    await teardown();
  });

  it('parceiro duplicado no plano -> 422 (budget-plan-duplicate-partner)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const planId = await createPlan(app, token);
    await addBudget(app, token, planId);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/budget-plans/${planId}/budgets`,
      headers: { authorization: `Bearer ${token}` },
      payload: { partnerKind: 'state', partnerRef: STATE_REF, valueInCents: 999 },
    });
    assert.equal(res.statusCode, 422, res.body);
    await teardown();
  });
});

describe('DELETE /budget-plans/:id/budgets/:budgetId', () => {
  it('CA4: remove o orçamento -> 204', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const planId = await createPlan(app, token);
    const budgetId = await addBudget(app, token, planId);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v2/budget-plans/${planId}/budgets/${budgetId}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 204, res.body);
    await teardown();
  });

  it('orçamento inexistente -> 404 (budget-not-found)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const planId = await createPlan(app, token);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v2/budget-plans/${planId}/budgets/${MISSING_BUDGET}`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 404, res.body);
    await teardown();
  });

  it('sem budget-plan:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const writer = await login(app, WRITER_EMAIL);
    const planId = await createPlan(app, writer);
    const budgetId = await addBudget(app, writer, planId);
    const noperm = await registerAndLogin(app, 'budget.semperm@example.com');
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/v2/budget-plans/${planId}/budgets/${budgetId}`,
      headers: { authorization: `Bearer ${noperm}` },
    });
    assert.equal(res.statusCode, 403, res.body);
    await teardown();
  });
});
