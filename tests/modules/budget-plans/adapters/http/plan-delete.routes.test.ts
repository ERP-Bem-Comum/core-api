/**
 * BGP-PLAN-DELETE (#453) — W0 RED — contrato HTTP.
 *   DELETE /budget-plans/:id  write -> 204 · 404 · 409 · 400
 *
 * ≠ do `DELETE /:id/budgets/:budgetId` (#377), que remove um orçamento/Rede DE DENTRO do plano.
 * Aqui é o plano inteiro — o item "Excluir Plano" do menu, hoje `disabled` no front por não haver rota.
 *
 * Os dois 409 são decisão de produto (2026-07-15), não detalhe de implementação: plano APROVADO e
 * plano com filhos não somem. Ver 000-request §D1/D2.
 *
 * RED esperado: a rota não existe → 404 do Fastify em tudo.
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
const WRITER_EMAIL = 'plan.delete.writer@example.com';

const PROGRAM_ETI = '11111111-1111-4111-8111-111111111111';
const STATE_REF = 'CE';
const MISSING_PLAN = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';

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

const login = async (app: App): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/auth/login',
    payload: { email: WRITER_EMAIL, password: STRONG },
  });
  return (res.json() as { accessToken: string }).accessToken;
};

const createPlan = async (app: App, token: string, year = 2026): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans',
    headers: { authorization: `Bearer ${token}` },
    payload: { year, programRef: PROGRAM_ETI },
  });
  assert.equal(res.statusCode, 201, `criar plano falhou: ${res.body}`);
  return (res.json() as { id: string }).id;
};

const del = (app: App, token: string, id: string) =>
  app.inject({
    method: 'DELETE',
    url: `/api/v2/budget-plans/${id}`,
    headers: { authorization: `Bearer ${token}` },
  });

const approve = (app: App, token: string, id: string) =>
  app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${id}/approve`,
    headers: { authorization: `Bearer ${token}` },
  });

const createScenery = (app: App, token: string, id: string, name: string) =>
  app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${id}/scenery`,
    headers: { authorization: `Bearer ${token}` },
    payload: { name },
  });

describe('DELETE /budget-plans/:id — sucesso (#453, CA1)', () => {
  it('CA1: plano RASCUNHO sem filhos → 204 e some da leitura', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);

      const res = await del(app, token, planId);
      assert.equal(res.statusCode, 204, res.body);

      const after = await app.inject({
        method: 'GET',
        url: `/api/v2/budget-plans/${planId}`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(after.statusCode, 404, 'o plano não deve mais ser encontrado');
    } finally {
      await teardown();
    }
  });

  it('CA1/CA2: plano com orçamento → 204 (o orçamento vai junto)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const add = await app.inject({
        method: 'POST',
        url: `/api/v2/budget-plans/${planId}/budgets`,
        headers: { authorization: `Bearer ${token}` },
        payload: { partnerKind: 'state', partnerRef: STATE_REF, valueInCents: 500000 },
      });
      assert.equal(add.statusCode, 201, add.body);

      const res = await del(app, token, planId);
      assert.equal(res.statusCode, 204, res.body);
    } finally {
      await teardown();
    }
  });
});

describe('DELETE /budget-plans/:id — bloqueios (#453, CA3/CA4)', () => {
  it('CA3: plano APROVADO → 409 e o plano CONTINUA lá', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      assert.equal((await approve(app, token, planId)).statusCode, 200);

      const res = await del(app, token, planId);
      assert.equal(res.statusCode, 409, res.body);

      // O 409 não vale nada se o plano sumiu assim mesmo.
      const after = await app.inject({
        method: 'GET',
        url: `/api/v2/budget-plans/${planId}`,
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(after.statusCode, 200, 'plano aprovado permanece intacto');
    } finally {
      await teardown();
    }
  });

  it('CA4: plano RASCUNHO com cenário filho → 409, e pai e filho permanecem', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const scenery = await createScenery(app, token, planId, 'Otimista');
      assert.equal(scenery.statusCode, 201, scenery.body);
      const sceneryId = (scenery.json() as { id: string }).id;

      const res = await del(app, token, planId);
      assert.equal(res.statusCode, 409, res.body);

      for (const id of [planId, sceneryId]) {
        const after = await app.inject({
          method: 'GET',
          url: `/api/v2/budget-plans/${id}`,
          headers: { authorization: `Bearer ${token}` },
        });
        assert.equal(after.statusCode, 200, `${id} deveria continuar existindo`);
      }
    } finally {
      await teardown();
    }
  });

  // O caminho que o usuário segue depois do 409: apaga o filho, aí o pai sai.
  it('CA4: apagado o cenário, o pai passa a aceitar DELETE → 204', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const scenery = await createScenery(app, token, planId, 'Otimista');
      const sceneryId = (scenery.json() as { id: string }).id;

      assert.equal((await del(app, token, sceneryId)).statusCode, 204, 'folha sai primeiro');
      assert.equal((await del(app, token, planId)).statusCode, 204, 'sem filhos, o pai sai');
    } finally {
      await teardown();
    }
  });
});

describe('DELETE /budget-plans/:id — erros de entrada (#453, CA5/CA6)', () => {
  // Exige o CÓDIGO do domínio, não só o status: enquanto a rota não existe, o 404 é o genérico do
  // Fastify e o teste passaria pelo motivo errado — verde sem nada implementado.
  it('CA5: id inexistente → 404 budget-plan-not-found (não o 404 de rota ausente)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const res = await del(app, token, MISSING_PLAN);
      assert.equal(res.statusCode, 404, res.body);
      const body = res.json() as { error?: { code?: string } };
      assert.equal(body.error?.code, 'budget-plan-not-found', res.body);
    } finally {
      await teardown();
    }
  });

  it('CA6: id malformado → 400', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const res = await del(app, token, 'nao-e-uuid');
      assert.equal(res.statusCode, 400, res.body);
    } finally {
      await teardown();
    }
  });

  it('sem token → 401 (a rota é protegida como as demais de escrita)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/v2/budget-plans/${MISSING_PLAN}`,
      });
      assert.equal(res.statusCode, 401, res.body);
    } finally {
      await teardown();
    }
  });
});
