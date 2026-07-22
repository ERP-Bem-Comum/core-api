/**
 * BDG-PLAN-LIFECYCLE (US4) — contrato HTTP do ciclo de vida.
 *   POST /budget-plans/:id/start-calibration  write -> 201 (filho EM_CALIBRACAO) — CA1
 *   POST /budget-plans/:id/scenery            write -> 201 (cenário RASCUNHO) — CA4
 *   POST /budget-plans/:id/approve            write -> 200 (APROVADO) — CA2
 * Erros de transição -> 409; nome de cenário vazio -> 400 (Zod).
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
const WRITER = 'lifecycle.writer@example.com';
const PROGRAM_ETI = '11111111-1111-4111-8111-111111111111';

const makeApp = async () => {
  const authDeps = await buildAuthHttpDeps({
    driver: 'memory',
    seed: {
      users: [
        {
          email: WRITER,
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

const login = async (app: App): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const createPlanYear = async (app: App, token: string, year: number): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans',
    headers: { authorization: `Bearer ${token}` },
    payload: { year, programRef: PROGRAM_ETI },
  });
  assert.equal(res.statusCode, 201, res.body);
  return (res.json() as { id: string }).id;
};

const createPlan = (app: App, token: string): Promise<string> => createPlanYear(app, token, 2026);

const approve = (app: App, token: string, id: string) =>
  app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${id}/approve`,
    headers: { authorization: `Bearer ${token}` },
  });

describe('POST /budget-plans/:id/approve (CA2)', () => {
  it('sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/budget-plans/${PROGRAM_ETI}/approve`,
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('RASCUNHO -> 200 APROVADO', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const planId = await createPlan(app, token);
    const res = await approve(app, token, planId);
    assert.equal(res.statusCode, 200, res.body);
    assert.equal((res.json() as { status: string }).status, 'APROVADO');
    await teardown();
  });

  it('já APROVADO -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const planId = await createPlan(app, token);
    await approve(app, token, planId);
    const res = await approve(app, token, planId);
    assert.equal(res.statusCode, 409, res.body);
    await teardown();
  });
});

describe('POST /budget-plans/:id/start-calibration (CA1)', () => {
  it('de plano APROVADO -> 201 filho EM_CALIBRACAO (version major+1, parentId)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const planId = await createPlan(app, token);
    await approve(app, token, planId);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/budget-plans/${planId}/start-calibration`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as { status: string; version: string; parentId: string | null };
    assert.equal(body.status, 'EM_CALIBRACAO');
    assert.equal(body.version, '2.0');
    assert.equal(body.parentId, planId);
    await teardown();
  });

  it('de plano não-APROVADO -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const planId = await createPlan(app, token);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/budget-plans/${planId}/start-calibration`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 409, res.body);
    await teardown();
  });
});

describe('POST /budget-plans/:id/scenery (CA4)', () => {
  it('de plano RASCUNHO -> 201 cenário RASCUNHO (scenarioName, version minor+1)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const planId = await createPlan(app, token);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/budget-plans/${planId}/scenery`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Otimista' },
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as { status: string; scenarioName: string; version: string };
    assert.equal(body.status, 'RASCUNHO');
    assert.equal(body.scenarioName, 'Otimista');
    assert.equal(body.version, '1.1');
    await teardown();
  });

  it('nome vazio -> 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const planId = await createPlan(app, token);
    const res = await app.inject({
      method: 'POST',
      url: `/api/v2/budget-plans/${planId}/scenery`,
      headers: { authorization: `Bearer ${token}` },
      payload: { name: '   ' },
    });
    assert.equal(res.statusCode, 400, res.body);
    await teardown();
  });

  it('2 cenários do MESMO pai não colidem (v1.1, v1.2); o 3º -> 409 (máx 2) — Blocker corrigido e2e', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    const planId = await createPlan(app, token);
    const scenery = (name: string) =>
      app.inject({
        method: 'POST',
        url: `/api/v2/budget-plans/${planId}/scenery`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name },
      });

    const a = await scenery('A');
    assert.equal(a.statusCode, 201, a.body);
    assert.equal((a.json() as { version: string }).version, '1.1');

    const b = await scenery('B');
    assert.equal(b.statusCode, 201, b.body); // não colide (era o Blocker)
    assert.equal((b.json() as { version: string }).version, '1.2');

    const c = await scenery('C');
    assert.equal(c.statusCode, 409, c.body); // máx 2
    await teardown();
  });
});

describe('GET /budget-plans/:id/insights (CA3)', () => {
  it('compara o total do plano com os anos anteriores do mesmo programa', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app);
    await createPlanYear(app, token, 2025);
    const plan2026 = await createPlanYear(app, token, 2026);

    const res = await app.inject({
      method: 'GET',
      url: `/api/v2/budget-plans/${plan2026}/insights`,
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      current: { year: number };
      previousYears: { year: number }[];
    };
    assert.equal(body.current.year, 2026);
    assert.equal(body.previousYears.length, 1);
    assert.equal(body.previousYears[0]?.year, 2025);
    await teardown();
  });
});
