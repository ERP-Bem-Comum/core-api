/**
 * BGP-INSIGHTS-REALIZED — W0 (RED) — GET /budget-plans/:id/insights (#416).
 *
 * A resposta passa a trazer, além do Planejado (`current`/`previousYears` com `totalInCents`):
 *   - `realizedInCents` em cada ano (Realizado real — Σ conciliado do plano via reader do financial);
 *   - `networksCount` no topo (= número de Redes/orçamentos do plano).
 *
 * Driver `memory`: sem lastro de conciliação no financial → `realizedInCents` deve ser 0 (CA1:
 * plano sem conciliados → 0). O valor > 0 (com parciais) é pinado no teste de integração MySQL do
 * reader. Aqui provamos o CONTRATO HTTP: campos novos presentes + Planejado intacto (CA4) + RBAC.
 *
 * DEVE FALHAR: hoje o schema só expõe `{ current:{year,totalInCents}, previousYears:[...] }` — sem
 * `realizedInCents` (stripado na serialização) nem `networksCount`.
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
  partnerRef: string,
): Promise<void> => {
  const res = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/budgets`,
    headers: { authorization: `Bearer ${token}` },
    payload: { partnerKind: 'state', partnerRef, valueInCents: 500000 },
  });
  assert.equal(res.statusCode, 201, res.body);
};

interface YearTotal {
  year: number;
  totalInCents: number;
  realizedInCents: number;
}
interface InsightsBody {
  current: YearTotal;
  previousYears: YearTotal[];
  networksCount: number;
}

const getInsights = async (app: App, token: string, planId: string) =>
  app.inject({
    method: 'GET',
    url: `/api/v2/budget-plans/${planId}/insights`,
    headers: { authorization: `Bearer ${token}` },
  });

describe('GET /budget-plans/:id/insights — Realizado + networksCount (#416)', () => {
  it('CA1/CA3/CA4: networksCount = Redes; realizedInCents 0 (memory); Planejado intacto', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      await addBudget(app, token, planId, STATE_CE);
      await addBudget(app, token, planId, STATE_SP);

      const res = await getInsights(app, token, planId);
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as InsightsBody;

      // networksCount = nº de Redes do plano (2 orçamentos state).
      assert.equal(body.networksCount, 2);

      // current: Planejado intacto (CA4) + Realizado presente (0 sem lastro de conciliação).
      assert.equal(body.current.year, 2026);
      assert.equal(body.current.totalInCents, 1_000_000, 'Planejado (2×500000) inalterado');
      assert.equal(body.current.realizedInCents, 0);
    } finally {
      await teardown();
    }
  });

  it('CA3: plano sem Redes → networksCount 0', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);

      const res = await getInsights(app, token, planId);
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as InsightsBody;
      assert.equal(body.networksCount, 0);
      assert.equal(body.current.realizedInCents, 0);
    } finally {
      await teardown();
    }
  });

  it('CA4: RBAC preservado — sem token → 401', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/budget-plans/${planId}/insights`,
      });
      assert.equal(res.statusCode, 401, res.body);
    } finally {
      await teardown();
    }
  });
});
