/**
 * BGP-COST-STRUCTURE-EDIT (#454 gap 3) — W0 RED — contrato HTTP do editar/desativar.
 *
 *   PATCH /budget-plans/:id/cost-structure/cost-centers/:nodeId    write -> 200 árvore
 *   PATCH /budget-plans/:id/cost-structure/categories/:nodeId      write -> 200 árvore
 *   PATCH /budget-plans/:id/cost-structure/subcategories/:nodeId   write -> 200 árvore
 *   body: { name?, active? }
 *
 * O GET passa a expor `active` — o EFETIVO (nó ∧ ancestrais), que é o que a árvore do front já
 * mostra. Sem isso o front veria filho ativo pendurado em centro inativo.
 *
 * Mapa erro->HTTP: budget-plan-not-editable -> 409 · cost-node-not-found -> 404 ·
 * cost-node-name-required -> 400 · budget-plan-not-found -> 404.
 *
 * RED esperado: as rotas não existem → 404 do Fastify.
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
const WRITER_EMAIL = 'cost.edit.writer@example.com';
const PROGRAM_ETI_REF = '11111111-1111-4111-8111-111111111111';
const APROVADO_PLAN_ID = '77777777-7777-4777-8777-777777777777';
const UUID_ORFAO = '66666666-6666-4666-8666-666666666666';

interface Tree {
  costCenters: {
    id: string;
    name: string;
    active: boolean;
    categories: {
      id: string;
      name: string;
      active: boolean;
      subcategories: { id: string; name: string; active: boolean }[];
    }[];
  }[];
}

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

// Monta 1 centro → 1 categoria → 1 subcategoria e devolve os 3 ids.
const seedTree = async (app: App, token: string, planId: string) => {
  const h = { authorization: `Bearer ${token}` };
  const cc = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/cost-structure/cost-centers`,
    headers: h,
    payload: { name: 'Operacional', direction: 'A PAGAR' },
  });
  assert.equal(cc.statusCode, 201, cc.body);
  const ccId = (cc.json() as Tree).costCenters[0]!.id;

  const cat = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/cost-structure/categories`,
    headers: h,
    payload: { costCenterId: ccId, name: 'Pessoal' },
  });
  assert.equal(cat.statusCode, 201, cat.body);
  const catId = (cat.json() as Tree).costCenters[0]!.categories[0]!.id;

  const sub = await app.inject({
    method: 'POST',
    url: `/api/v2/budget-plans/${planId}/cost-structure/subcategories`,
    headers: h,
    payload: { categoryId: catId, name: 'Salários', launchType: 'DESPESAS_PESSOAIS' },
  });
  assert.equal(sub.statusCode, 201, sub.body);
  const subId = (sub.json() as Tree).costCenters[0]!.categories[0]!.subcategories[0]!.id;

  return { ccId, catId, subId };
};

const patch = (
  app: App,
  token: string,
  planId: string,
  level: string,
  nodeId: string,
  payload: Readonly<{ name?: string; active?: boolean }>,
) =>
  app.inject({
    method: 'PATCH',
    url: `/api/v2/budget-plans/${planId}/cost-structure/${level}/${nodeId}`,
    headers: { authorization: `Bearer ${token}` },
    payload,
  });

const getTree = async (app: App, token: string, planId: string): Promise<Tree> => {
  const res = await app.inject({
    method: 'GET',
    url: `/api/v2/budget-plans/${planId}/cost-structure`,
    headers: { authorization: `Bearer ${token}` },
  });
  assert.equal(res.statusCode, 200, res.body);
  return res.json() as Tree;
};

describe('PATCH cost-structure — renomear (#454 gap 3, CA1)', () => {
  it('CA1: renomeia nos 3 níveis e persiste', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const { ccId, catId, subId } = await seedTree(app, token, planId);

      assert.equal(
        (await patch(app, token, planId, 'cost-centers', ccId, { name: 'Admin' })).statusCode,
        200,
      );
      assert.equal(
        (await patch(app, token, planId, 'categories', catId, { name: 'Folha' })).statusCode,
        200,
      );
      assert.equal(
        (await patch(app, token, planId, 'subcategories', subId, { name: 'Base' })).statusCode,
        200,
      );

      const tree = await getTree(app, token, planId);
      const cc = tree.costCenters[0]!;
      assert.equal(cc.name, 'Admin');
      assert.equal(cc.categories[0]!.name, 'Folha');
      assert.equal(cc.categories[0]!.subcategories[0]!.name, 'Base');
    } finally {
      await teardown();
    }
  });

  it('CA7: name vazio → 400', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const { ccId } = await seedTree(app, token, planId);
      const res = await patch(app, token, planId, 'cost-centers', ccId, { name: '   ' });
      assert.equal(res.statusCode, 400, res.body);
    } finally {
      await teardown();
    }
  });
});

describe('PATCH cost-structure — desativar (#454 gap 3, CA2/CA3/CA4)', () => {
  it('CA2: desativa a subcategoria — ela volta no GET, inativa (soft, não some)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const { subId } = await seedTree(app, token, planId);

      assert.equal(
        (await patch(app, token, planId, 'subcategories', subId, { active: false })).statusCode,
        200,
      );

      const tree = await getTree(app, token, planId);
      const subs = tree.costCenters[0]!.categories[0]!.subcategories;
      assert.equal(subs.length, 1, 'soft: continua na árvore');
      assert.equal(subs[0]!.active, false);
    } finally {
      await teardown();
    }
  });

  it('CA3: Centro inativo → o GET devolve filhos inativos (estado efetivo)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const { ccId } = await seedTree(app, token, planId);

      assert.equal(
        (await patch(app, token, planId, 'cost-centers', ccId, { active: false })).statusCode,
        200,
      );

      const cc = (await getTree(app, token, planId)).costCenters[0]!;
      assert.equal(cc.active, false);
      assert.equal(cc.categories[0]!.active, false, 'herança: o front esconde o ramo inteiro');
      assert.equal(cc.categories[0]!.subcategories[0]!.active, false);
    } finally {
      await teardown();
    }
  });

  it('CA4: reativar o Centro não revive quem foi desativado à mão', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const { ccId, subId } = await seedTree(app, token, planId);

      await patch(app, token, planId, 'subcategories', subId, { active: false });
      await patch(app, token, planId, 'cost-centers', ccId, { active: false });
      await patch(app, token, planId, 'cost-centers', ccId, { active: true });

      const cc = (await getTree(app, token, planId)).costCenters[0]!;
      assert.equal(cc.active, true);
      assert.equal(cc.categories[0]!.active, true, 'a categoria volta — nunca foi desativada');
      assert.equal(
        cc.categories[0]!.subcategories[0]!.active,
        false,
        'a subcategoria continua inativa: foi desativada por si',
      );
    } finally {
      await teardown();
    }
  });

  it('name e active na mesma chamada', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const { catId } = await seedTree(app, token, planId);

      const res = await patch(app, token, planId, 'categories', catId, {
        name: 'Folha',
        active: false,
      });
      assert.equal(res.statusCode, 200, res.body);

      const cat = (await getTree(app, token, planId)).costCenters[0]!.categories[0]!;
      assert.equal(cat.name, 'Folha');
      assert.equal(cat.active, false);
    } finally {
      await teardown();
    }
  });
});

describe('PATCH cost-structure — erros (#454 gap 3, CA5/CA6/CA7)', () => {
  it('CA5: plano APROVADO → 409 e nada muda', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      // O plano aprovado do seed não tem árvore; o guard de status vem ANTES de achar o nó,
      // então o 409 é o que responde — é justamente a precedência que interessa travar.
      const res = await patch(app, token, APROVADO_PLAN_ID, 'cost-centers', UUID_ORFAO, {
        name: 'X',
      });
      assert.equal(res.statusCode, 409, res.body);
    } finally {
      await teardown();
    }
  });

  // Exige o CÓDIGO do domínio: enquanto a rota não existe, o 404 é o genérico do Fastify e o teste
  // passaria pelo motivo errado — verde sem nada implementado.
  it('CA6: nó inexistente → 404 cost-node-not-found (não o 404 de rota ausente)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      await seedTree(app, token, planId);
      const res = await patch(app, token, planId, 'cost-centers', UUID_ORFAO, { name: 'X' });
      assert.equal(res.statusCode, 404, res.body);
      const body = res.json() as { error?: { code?: string } };
      assert.equal(body.error?.code, 'cost-node-not-found', res.body);
    } finally {
      await teardown();
    }
  });

  it('CA6: nó de OUTRO plano → 404 (nunca editar árvore alheia)', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planA = await createPlan(app, token);
      const { ccId } = await seedTree(app, token, planA);

      // Plano B (outro ano) não tem esse nó: o PATCH nele não pode achar o nó do A.
      const resB = await app.inject({
        method: 'POST',
        url: '/api/v2/budget-plans',
        headers: { authorization: `Bearer ${token}` },
        payload: { year: 2027, programRef: PROGRAM_ETI_REF },
      });
      const planB = (resB.json() as { id: string }).id;

      const res = await patch(app, token, planB, 'cost-centers', ccId, { name: 'Invadido' });
      assert.equal(res.statusCode, 404, res.body);
      const body = res.json() as { error?: { code?: string } };
      assert.equal(body.error?.code, 'cost-node-not-found', res.body);

      const treeA = await getTree(app, token, planA);
      assert.equal(treeA.costCenters[0]!.name, 'Operacional', 'a árvore do A não foi tocada');
    } finally {
      await teardown();
    }
  });

  it('CA7: body vazio → 400', async () => {
    const { app, teardown } = await makeApp();
    try {
      const token = await login(app);
      const planId = await createPlan(app, token);
      const { ccId } = await seedTree(app, token, planId);
      const res = await patch(app, token, planId, 'cost-centers', ccId, {});
      assert.equal(res.statusCode, 400, res.body);
    } finally {
      await teardown();
    }
  });

  it('sem token → 401', async () => {
    const { app, teardown } = await makeApp();
    try {
      const res = await app.inject({
        method: 'PATCH',
        url: `/api/v2/budget-plans/${UUID_ORFAO}/cost-structure/cost-centers/${UUID_ORFAO}`,
        payload: { name: 'X' },
      });
      assert.equal(res.statusCode, 401, res.body);
    } finally {
      await teardown();
    }
  });
});
