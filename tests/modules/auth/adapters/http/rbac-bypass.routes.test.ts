/**
 * AUTH-RBAC-BYPASS-FLAG (ADR-0052) — W0 RED — CA4/CA5/CA6/CA7 (comportamento na borda).
 *
 * O bypass é ligado em `buildAuthHttpDeps({ rbacMode: 'bypass' })` — um ponto, todos os módulos
 * herdam. Provamos contra um módulo real (budget-plans) que:
 *   - `bypass`  : usuário logado SEM a permissão de escrita passa (CA4); e `hasPermission` libera (CA7).
 *   - `enforced`: o mesmo usuário toma 403 (CA5 — não regride).
 *   - qualquer modo: sem token → 401 (CA6 — autenticação intacta).
 *
 * RED esperado: `buildAuthHttpDeps` ainda não aceita `rbacMode`; no modo bypass hoje ainda dá 403.
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
const PROGRAM_ETI = '11111111-1111-4111-8111-111111111111';
// Um usuário só com `read` — NÃO tem `write`. Numa rota de escrita: 403 em enforced, passa em bypass.
const READER_EMAIL = 'rbac.reader@example.com';

const makeApp = async (rbacMode: 'enforced' | 'bypass') => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    rbacMode,
    seed: {
      users: [
        { email: READER_EMAIL, password: STRONG, permissions: [BUDGET_PLAN_PERMISSION.read] },
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

const login = async (app: App): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: READER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

// Rota de ESCRITA (exige budget-plan:write, que o READER não tem).
const createPlan = (app: App, token: string) =>
  app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans',
    headers: { authorization: `Bearer ${token}` },
    payload: { year: 2026, programRef: PROGRAM_ETI },
  });

describe('RBAC bypass — comportamento na borda (ADR-0052)', () => {
  it('CA5: enforced (default) → usuário sem write toma 403 (não regride)', async () => {
    const { app, teardown } = await makeApp('enforced');
    try {
      const res = await createPlan(app, await login(app));
      assert.equal(res.statusCode, 403, res.body);
    } finally {
      await teardown();
    }
  });

  it('CA4: bypass → o MESMO usuário sem write passa (201)', async () => {
    const { app, teardown } = await makeApp('bypass');
    try {
      const res = await createPlan(app, await login(app));
      assert.equal(res.statusCode, 201, `bypass deveria liberar a escrita: ${res.body}`);
    } finally {
      await teardown();
    }
  });

  it('CA6: bypass NÃO afeta a autenticação — sem token → 401', async () => {
    const { app, teardown } = await makeApp('bypass');
    try {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v2/budget-plans',
        payload: { year: 2026, programRef: PROGRAM_ETI },
      });
      assert.equal(res.statusCode, 401, 'logado continua obrigatório');
    } finally {
      await teardown();
    }
  });

  // CA7 — a rota de PATCH de estrutura passa por authorize(write); no bypass, um leitor a alcança.
  // Cobre o segundo ponto de checagem junto do primeiro: se só o preHandler fosse bypassado e o
  // hasPermission não, as rotas do partners com autorização condicional continuariam barrando.
  it('CA7: bypass libera também rotas de escrita subsequentes (mesmo token de leitor)', async () => {
    const { app, teardown } = await makeApp('bypass');
    try {
      const token = await login(app);
      const planRes = await createPlan(app, token);
      assert.equal(planRes.statusCode, 201, planRes.body);
      const planId = (planRes.json() as { id: string }).id;

      const budget = await app.inject({
        method: 'POST',
        url: `/api/v2/budget-plans/${planId}/budgets`,
        headers: { authorization: `Bearer ${token}` },
        payload: { partnerKind: 'state', partnerRef: 'CE' },
      });
      assert.equal(budget.statusCode, 201, budget.body);
    } finally {
      await teardown();
    }
  });
});
