/**
 * #1092 — POST /api/v2/budget-plans com `importFromYear` ("Criar a partir do ano de"), pela borda.
 *
 * O caso de uso tem suíte própria (create-budget-plan.import-from-year.test.ts). Aqui o que se trava
 * é o contrato HTTP: o campo passa pelo Zod, a 201 traz o total copiado (igual ao detalhe do plano
 * novo), e cada erro sai com o status e o slug certos.
 */

import { describe, it } from 'bun:test';
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
const WRITER_EMAIL = 'import.writer@example.com';
const PROGRAM_ETI = '11111111-1111-4111-8111-111111111111';
// IPCA com índice 0: o valor lançado é a própria base.
const BASE = 100000;

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
const H = (t: string) => ({ authorization: `Bearer ${t}` });

const login = async (app: App): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const post = (app: App, token: string, url: string, payload?: object) =>
  app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans${url}`,
    headers: H(token),
    ...(payload === undefined ? {} : { payload }),
  });

const idOf = (body: string): string => (JSON.parse(body) as { id: string }).id;

// Plano de 2025 com rede CE, árvore cc → cat → sub(IPCA) e lançamento em jan e fev.
// Aprovado quando `approve` é true. Devolve o id do plano.
const seed2025 = async (app: App, token: string, approve: boolean): Promise<string> => {
  const plan = await post(app, token, '', { year: 2025, programRef: PROGRAM_ETI });
  assert.equal(plan.statusCode, 201, plan.body);
  const planId = idOf(plan.body);

  const budget = await post(app, token, `/${planId}/budgets`, {
    partnerKind: 'state',
    partnerRef: 'CE',
  });
  assert.equal(budget.statusCode, 201, budget.body);
  const budgetId = idOf(budget.body);

  const cc = await post(app, token, `/${planId}/cost-structure/cost-centers`, {
    name: 'Operacional',
    direction: 'A PAGAR',
  });
  assert.equal(cc.statusCode, 201, cc.body);
  const ccId = (cc.json() as { costCenters: { id: string }[] }).costCenters[0]!.id;
  const cat = await post(app, token, `/${planId}/cost-structure/categories`, {
    costCenterId: ccId,
    name: 'Pessoal',
  });
  assert.equal(cat.statusCode, 201, cat.body);
  const catId = (cat.json() as { costCenters: { categories: { id: string }[] }[] }).costCenters[0]!
    .categories[0]!.id;
  const sub = await post(app, token, `/${planId}/cost-structure/subcategories`, {
    categoryId: catId,
    name: 'Salários',
    launchType: 'IPCA',
  });
  assert.equal(sub.statusCode, 201, sub.body);
  const subId = (
    sub.json() as { costCenters: { categories: { subcategories: { id: string }[] }[] }[] }
  ).costCenters[0]!.categories[0]!.subcategories[0]!.id;

  for (const month of [1, 2]) {
    const launched = await post(app, token, '/budget-results/ipca', {
      budgetId,
      subcategoryId: subId,
      month,
      baseValueInCents: BASE,
      ipca: 0,
    });
    assert.equal(launched.statusCode, 201, launched.body);
  }
  if (approve) {
    const approved = await post(app, token, `/${planId}/approve`);
    assert.equal(approved.statusCode, 200, approved.body);
  }
  return planId;
};

describe('POST /budget-plans com importFromYear (#1092)', () => {
  it('201: plano 2026 RASCUNHO v1.0 com o total da origem, e o detalhe concorda', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      await seed2025(app, token, true);

      const res = await post(app, token, '', {
        year: 2026,
        programRef: PROGRAM_ETI,
        importFromYear: 2025,
      });
      assert.equal(res.statusCode, 201, res.body);
      const created = res.json() as {
        id: string;
        year: number;
        status: string;
        version: string;
        totalInCents: number;
      };
      assert.equal(created.year, 2026);
      assert.equal(created.status, 'RASCUNHO');
      assert.equal(created.version, '1.0');
      assert.equal(created.totalInCents, BASE * 2);

      const detail = await app.inject({
        method: 'GET',
        url: `/api/v2/budget-plans/${created.id}`,
        headers: H(token),
      });
      assert.equal(detail.statusCode, 200, detail.body);
      assert.equal((detail.json() as { totalInCents: number }).totalInCents, BASE * 2);
    } finally {
      await teardown();
    }
  });

  it('409 budget-plan-import-source-not-approved quando a origem não foi aprovada', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      await seed2025(app, token, false);

      const res = await post(app, token, '', {
        year: 2026,
        programRef: PROGRAM_ETI,
        importFromYear: 2025,
      });
      assert.equal(res.statusCode, 409, res.body);
      assert.equal(
        (res.json() as { error: { code: string } }).error.code,
        'budget-plan-import-source-not-approved',
      );
    } finally {
      await teardown();
    }
  });

  it('422 budget-plan-import-same-year quando o ano de origem é o ano novo', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const res = await post(app, token, '', {
        year: 2026,
        programRef: PROGRAM_ETI,
        importFromYear: 2026,
      });
      assert.equal(res.statusCode, 422, res.body);
      assert.equal(
        (res.json() as { error: { code: string } }).error.code,
        'budget-plan-import-same-year',
      );
    } finally {
      await teardown();
    }
  });

  it('400 do Zod para importFromYear fora da faixa ou não inteiro', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      for (const importFromYear of [1999, 2025.5, '2025']) {
        const res = await post(app, token, '', {
          year: 2026,
          programRef: PROGRAM_ETI,
          importFromYear,
        });
        assert.equal(res.statusCode, 400, `${String(importFromYear)}: ${res.body}`);
      }
    } finally {
      await teardown();
    }
  });
});
