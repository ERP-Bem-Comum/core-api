/**
 * BDG-CONSOLIDATED-CSV (US5) — contrato HTTP do Consolidado ABC + CSV.
 *   GET /budget-plans/consolidated-result       read -> 200 (JSON: total + resumo por plano) — CA1
 *   GET /budget-plans/consolidated-result/csv    read -> 200 text/csv inline — CA2
 *   GET /budget-plans/:id/generate-csv           read -> 200 text/csv inline (plano APROVADO) — CA3
 * Plano não-aprovado -> 409; ausente -> 404; year ausente -> 400 (Zod); sem token -> 401.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { BOM } from '#src/shared/utils/csv.ts';
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
import { BUDGET_PLAN_CSV_HEADER } from '#src/modules/budget-plans/adapters/http/budget-plan-csv.ts';

const STRONG = 'Str0ng-Passphrase-2026!';
const WRITER = 'consolidated.writer@example.com';
const PROGRAM_ETI = '11111111-1111-4111-8111-111111111111';
const STATE_CE = 'CE';

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
      partnerStates: [{ ref: STATE_CE, name: 'Ceará', uf: 'CE' }],
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

const auth = (token: string) => ({ authorization: `Bearer ${token}` });

// Cria plano com 1 orçamento + árvore 1×1×1; aprova (se `approve`). Devolve o id do plano.
const seedPlan = async (
  app: App,
  token: string,
  opts: Readonly<{ year: number; approve: boolean; valueInCents: number }>,
): Promise<string> => {
  const created = await app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans',
    headers: auth(token),
    payload: { year: opts.year, programRef: PROGRAM_ETI },
  });
  assert.equal(created.statusCode, 201, created.body);
  const id = (created.json() as { id: string }).id;

  const budget = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${id}/budgets`,
    headers: auth(token),
    payload: { partnerKind: 'state', partnerRef: STATE_CE, valueInCents: opts.valueInCents },
  });
  assert.equal(budget.statusCode, 201, budget.body);

  const cc = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${id}/cost-structure/cost-centers`,
    headers: auth(token),
    payload: { name: 'Operacional', direction: 'A PAGAR' },
  });
  assert.equal(cc.statusCode, 201, cc.body);
  const costCenterId = (cc.json() as { costCenters: { id: string }[] }).costCenters[0]!.id;

  const cat = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${id}/cost-structure/categories`,
    headers: auth(token),
    payload: { costCenterId, name: 'Pessoal' },
  });
  assert.equal(cat.statusCode, 201, cat.body);
  const categoryId = (cat.json() as { costCenters: { categories: { id: string }[] }[] })
    .costCenters[0]!.categories[0]!.id;

  const sub = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${id}/cost-structure/subcategories`,
    headers: auth(token),
    payload: { categoryId, name: 'Salários', launchType: 'DESPESAS_PESSOAIS' },
  });
  assert.equal(sub.statusCode, 201, sub.body);

  if (opts.approve) {
    const approved = await app.inject({
      method: 'POST',
      url: `/api/v2/budget-plans/${id}/approve`,
      headers: auth(token),
    });
    assert.equal(approved.statusCode, 200, approved.body);
  }
  return id;
};

describe('GET /budget-plans/consolidated-result (CA1)', () => {
  it('agrega planos aprovados do ano em centavos + resumo por plano', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      await seedPlan(app, token, { year: 2026, approve: true, valueInCents: 100_000 });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/budget-plans/consolidated-result?year=2026',
        headers: auth(token),
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as {
        year: number;
        totalCents: number;
        plans: { programAbbreviation: string; version: number; totalCents: number }[];
      };
      assert.equal(body.year, 2026);
      // #458 — total derivado dos lançamentos; este seed não semeia budget_results → 0. A agregação
      // com valores reais está coberta em budget-total-derived.routes.test.ts (CA4).
      assert.equal(body.totalCents, 0);
      assert.equal(body.plans.length, 1);
      assert.equal(body.plans[0]?.programAbbreviation, 'ETI');
      assert.equal(body.plans[0]?.version, 1);
      assert.equal(body.plans[0]?.totalCents, 0);
    } finally {
      await teardown();
    }
  });

  it('sem year → 400 (Zod)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/budget-plans/consolidated-result',
        headers: auth(token),
      });
      assert.equal(res.statusCode, 400, res.body);
    } finally {
      await teardown();
    }
  });

  it('sem token → 401', async () => {
    const { app, teardown } = await makeApp();
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/budget-plans/consolidated-result?year=2026',
      });
      assert.equal(res.statusCode, 401, res.body);
    } finally {
      await teardown();
    }
  });
});

describe('GET /budget-plans/consolidated-result/csv (CA2)', () => {
  it('CSV inline: BOM, header de 20 colunas, ; e linha de dado', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await seedPlan(app, token, {
        year: 2026,
        approve: true,
        valueInCents: 100_000,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/budget-plans/consolidated-result/csv?year=2026',
        headers: auth(token),
      });
      assert.equal(res.statusCode, 200, res.body);
      assert.match(res.headers['content-type'] ?? '', /text\/csv/);
      assert.ok(res.body.startsWith(BOM), 'CSV deve iniciar com BOM');
      const lines = res.body.slice(BOM.length).split('\r\n').filter(Boolean);
      assert.equal(lines[0], BUDGET_PLAN_CSV_HEADER.join(';'));
      // 1 orçamento × 1 subcategoria = 1 linha de dado, começando pelo id do plano.
      assert.equal(lines.length, 2);
      assert.ok(lines[1]?.startsWith(`${planId};`));
    } finally {
      await teardown();
    }
  });
});

describe('GET /budget-plans/:id/generate-csv (CA3)', () => {
  it('plano aprovado → 200 text/csv com header + linhas do plano', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await seedPlan(app, token, {
        year: 2026,
        approve: true,
        valueInCents: 100_000,
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/budget-plans/${planId}/generate-csv`,
        headers: auth(token),
      });
      assert.equal(res.statusCode, 200, res.body);
      assert.match(res.headers['content-type'] ?? '', /text\/csv/);
      const lines = res.body.slice(BOM.length).split('\r\n').filter(Boolean);
      assert.equal(lines[0], BUDGET_PLAN_CSV_HEADER.join(';'));
      assert.equal(lines.length, 2);
    } finally {
      await teardown();
    }
  });

  it('plano não aprovado → 409 (plan-not-approved-for-consolidation)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await seedPlan(app, token, {
        year: 2026,
        approve: false,
        valueInCents: 100_000,
      });

      const res = await app.inject({
        method: 'GET',
        url: `/api/v2/budget-plans/${planId}/generate-csv`,
        headers: auth(token),
      });
      assert.equal(res.statusCode, 409, res.body);
    } finally {
      await teardown();
    }
  });

  it('plano inexistente → 404', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/budget-plans/00000000-0000-4000-8000-000000000000/generate-csv',
        headers: auth(token),
      });
      assert.equal(res.statusCode, 404, res.body);
    } finally {
      await teardown();
    }
  });
});
