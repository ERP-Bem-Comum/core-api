/**
 * BDG-COST-STRUCTURE — W0 (RED) — contrato HTTP da árvore de custos (Fatia 2/US2).
 *
 * DEVE FALHAR: as rotas de cost-structure, seus schemas/dto e o wiring do
 * CostStructureRepository na composition ainda não existem.
 *
 * 4 rotas sob /budget-plans/:id/cost-structure:
 *   GET    .../cost-structure                 read   -> 200 árvore
 *   POST   .../cost-structure/cost-centers    write  -> 201 árvore
 *   POST   .../cost-structure/categories      write  -> 201 árvore
 *   POST   .../cost-structure/subcategories   write  -> 201 árvore
 *
 * Mapa erro->HTTP (000-request.md / plugin):
 *   budget-plan-not-editable        -> 409 (plano APROVADO bloqueia escrita — CA3)
 *   cost-node-parent-not-found      -> 400 (pai órfão)
 *   cost-node-name-required         -> 400
 *   cost-node-invalid-direction     -> 422
 *   cost-node-invalid-launch-type   -> 422
 *   budget-plan-not-found           -> 404
 *   body malformado (Zod)           -> 400/422
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
const WRITER_EMAIL = 'cost.writer@example.com';
const NOPERM_EMAIL = 'cost.semperm@example.com';

const PROGRAM_ETI_REF = '11111111-1111-4111-8111-111111111111';
// Plano pré-existente em APROVADO (seed) — o agregado só nasce RASCUNHO, então CA3
// (bloqueio de escrita) na borda só é exercitável semeando um plano aprovado.
const APROVADO_PLAN_ID = '77777777-7777-4777-8777-777777777777';
const UUID_ORFAO = '66666666-6666-4666-8666-666666666666';

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
      plans: [
        { id: APROVADO_PLAN_ID, year: 2025, programRef: PROGRAM_ETI_REF, status: 'APROVADO' },
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

// Cria um plano RASCUNHO (editável) e devolve seu id.
const createPlan = async (app: App, token: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans',
    headers: { authorization: `Bearer ${token}` },
    payload: { year: 2026, programRef: PROGRAM_ETI_REF },
  });
  assert.equal(res.statusCode, 201, `criar plano falhou: ${res.body}`);
  return (res.json() as { id: string }).id;
};

const url = (planId: string, suffix = ''): string =>
  `/api/v2/budget-plans/${planId}/cost-structure${suffix}`;

describe('GET /budget-plans/:id/cost-structure', () => {
  it('sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({ method: 'GET', url: url(APROVADO_PLAN_ID) });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('sem budget-plan:read -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: url(APROVADO_PLAN_ID),
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('CA1: plano recém-criado -> 200 + árvore vazia', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const planId = await createPlan(app, token);
    const res = await app.inject({
      method: 'GET',
      url: url(planId),
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { budgetPlanId: string; costCenters: unknown[] };
    assert.equal(body.budgetPlanId, planId);
    assert.deepEqual(body.costCenters, []);
    await teardown();
  });

  it('id inexistente -> 404', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'GET',
      url: url('00000000-0000-4000-8000-000000000000'),
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(res.statusCode, 404);
    await teardown();
  });
});

describe('POST cost-structure — CA2 (add 3 níveis)', () => {
  it('adiciona cost-center -> category -> subcategory, cada um 201 + árvore', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const planId = await createPlan(app, token);
    const auth = { authorization: `Bearer ${token}` };

    const ccRes = await app.inject({
      method: 'POST',
      url: url(planId, '/cost-centers'),
      headers: auth,
      payload: { name: 'Pessoal', direction: 'A PAGAR' },
    });
    assert.equal(ccRes.statusCode, 201);
    const ccBody = ccRes.json() as {
      costCenters: { id: string; name: string; direction: string }[];
    };
    assert.equal(ccBody.costCenters.length, 1);
    assert.equal(ccBody.costCenters[0]?.name, 'Pessoal');
    const costCenterId = ccBody.costCenters[0]?.id;
    assert.ok(costCenterId);

    const catRes = await app.inject({
      method: 'POST',
      url: url(planId, '/categories'),
      headers: auth,
      payload: { costCenterId, name: 'Salários' },
    });
    assert.equal(catRes.statusCode, 201);
    const catBody = catRes.json() as {
      costCenters: { categories: { id: string; name: string }[] }[];
    };
    const categoryId = catBody.costCenters[0]?.categories[0]?.id;
    assert.ok(categoryId);

    const subRes = await app.inject({
      method: 'POST',
      url: url(planId, '/subcategories'),
      headers: auth,
      payload: { categoryId, name: 'CLT', launchType: 'IPCA' },
    });
    assert.equal(subRes.statusCode, 201);
    const subBody = subRes.json() as {
      costCenters: { categories: { subcategories: { name: string; launchType: string }[] }[] }[];
    };
    const sub = subBody.costCenters[0]?.categories[0]?.subcategories[0];
    assert.equal(sub?.name, 'CLT');
    assert.equal(sub?.launchType, 'IPCA');
    await teardown();
  });

  it('categoria com costCenterId órfão -> 400', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const planId = await createPlan(app, token);
    const res = await app.inject({
      method: 'POST',
      url: url(planId, '/categories'),
      headers: { authorization: `Bearer ${token}` },
      payload: { costCenterId: UUID_ORFAO, name: 'Salários' },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('CA3: cost-center em plano APROVADO -> 409', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: url(APROVADO_PLAN_ID, '/cost-centers'),
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Pessoal', direction: 'A PAGAR' },
    });
    assert.equal(res.statusCode, 409);
    await teardown();
  });

  it('sem Authorization -> 401', async () => {
    const { app, teardown } = await makeApp();
    const res = await app.inject({
      method: 'POST',
      url: url(APROVADO_PLAN_ID, '/cost-centers'),
      payload: { name: 'Pessoal', direction: 'A PAGAR' },
    });
    assert.equal(res.statusCode, 401);
    await teardown();
  });

  it('sem budget-plan:write -> 403', async () => {
    const { app, teardown } = await makeApp();
    const token = await registerAndLogin(app, NOPERM_EMAIL);
    const res = await app.inject({
      method: 'POST',
      url: url(APROVADO_PLAN_ID, '/cost-centers'),
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Pessoal', direction: 'A PAGAR' },
    });
    assert.equal(res.statusCode, 403);
    await teardown();
  });

  it('name acima de 255 chars -> 400 (Zod barra na borda, casa varchar(255))', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const planId = await createPlan(app, token);
    const res = await app.inject({
      method: 'POST',
      url: url(planId, '/cost-centers'),
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'x'.repeat(256), direction: 'A PAGAR' },
    });
    assert.equal(res.statusCode, 400);
    await teardown();
  });

  it('body malformado (direction ausente) -> 4xx de validação (não 500)', async () => {
    const { app, teardown } = await makeApp();
    const token = await login(app, WRITER_EMAIL);
    const planId = await createPlan(app, token);
    const res = await app.inject({
      method: 'POST',
      url: url(planId, '/cost-centers'),
      headers: { authorization: `Bearer ${token}` },
      payload: { name: 'Pessoal' },
    });
    assert.ok(
      res.statusCode === 400 || res.statusCode === 422,
      `esperava 400/422, veio ${res.statusCode}`,
    );
    await teardown();
  });
});
