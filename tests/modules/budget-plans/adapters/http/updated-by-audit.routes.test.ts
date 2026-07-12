/**
 * BGP-UPDATED-BY-AUDIT — W0 (RED) — issue #373.
 *
 * "Atualizado por" (updatedByRef) no plano: cada mutação do header grava o ator (req.userId, UUID v4).
 * Projetado no item de GET /budget-plans e nos filhos de GET /:id/children (D6).
 *
 * requireAuth FAKE injeta req.userId a partir do Bearer ("Bearer <userId>::<perms>"), permitindo
 * variar o ator por request (padrão dos testes http do financial).
 *
 * DEVE FALHAR: updatedByRef não existe em nenhuma camada ainda.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import {
  budgetPlansHttpPlugin,
  buildBudgetPlansHttpDeps,
} from '#src/modules/budget-plans/public-api/http.ts';
import { BUDGET_PLAN_PERMISSION } from '#src/modules/budget-plans/public-api/permissions.ts';

const PROGRAM_ETI_REF = '11111111-1111-4111-8111-111111111111';
const STATE_CE = 'CE';
// Atores (UUID v4 válidos — o UserRef exige v4).
const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const USER_C = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const RW = [BUDGET_PLAN_PERMISSION.read, BUDGET_PLAN_PERMISSION.write];

const bearer = (userId: string, perms: readonly string[] = RW): string =>
  `Bearer ${userId}::${perms.join(',')}`;

const requireAuth: preHandlerAsyncHookHandler = async (req, reply) => {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ error: { code: 'unauthorized', message: 'sem token' } });
  }
  const userId = auth.replace('Bearer ', '').split('::')[0] ?? '';
  (req as unknown as { userId: string }).userId = userId;
  return undefined;
};
const authorize =
  (permission: string): preHandlerAsyncHookHandler =>
  async (req, reply) => {
    const perms = (req.headers.authorization ?? '').split('::')[1]?.split(',') ?? [];
    if (!perms.includes(permission)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'sem permissão' } });
    }
    return undefined;
  };

const makeApp = async () => {
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
      partnerStates: [{ ref: STATE_CE, name: 'Ceará', uf: 'CE' }],
    },
  });
  const app = await buildApp({
    routes: [budgetPlansHttpPlugin(bpDeps, { requireAuth, authorize })],
  });
  const teardown = async (): Promise<void> => {
    await app.close();
    await bpDeps.shutdown();
  };
  return { app, teardown };
};

type App = Awaited<ReturnType<typeof buildApp>>;

const createPlan = async (app: App, actor: string): Promise<string> => {
  const res = await app.inject({
    method: 'POST',
    url: '/api/v2/budget-plans',
    headers: { authorization: bearer(actor) },
    payload: { year: 2026, programRef: PROGRAM_ETI_REF },
  });
  assert.equal(res.statusCode, 201, res.body);
  return (res.json() as { id: string }).id;
};

interface Item {
  id: string;
  updatedByRef: string | null;
}

const firstItem = async (app: App, actor: string): Promise<Item> => {
  const res = await app.inject({
    method: 'GET',
    url: '/api/v2/budget-plans',
    headers: { authorization: bearer(actor) },
  });
  assert.equal(res.statusCode, 200, res.body);
  const item = (res.json() as { items: Item[] }).items[0];
  assert.ok(item, 'esperava 1 item');
  return item;
};

describe('BGP-UPDATED-BY-AUDIT — updatedByRef nas mutações (#373)', () => {
  it('CA1: POST /budget-plans (A) → item.updatedByRef = A', async () => {
    const { app, teardown } = await makeApp();
    try {
      await createPlan(app, USER_A);
      const item = await firstItem(app, USER_A);
      assert.equal(item.updatedByRef, USER_A);
    } finally {
      await teardown();
    }
  });

  it('CA2: POST /:id/budgets (B) → updatedByRef do plano passa a B', async () => {
    const { app, teardown } = await makeApp();
    try {
      const planId = await createPlan(app, USER_A);
      const res = await app.inject({
        method: 'POST',
        url: `/api/v2/budget-plans/${planId}/budgets`,
        headers: { authorization: bearer(USER_B) },
        payload: { partnerKind: 'state', partnerRef: STATE_CE, valueInCents: 500000 },
      });
      assert.equal(res.statusCode, 201, res.body);
      const item = await firstItem(app, USER_A);
      assert.equal(item.updatedByRef, USER_B, 'última mutação (addBudget por B) vence');
    } finally {
      await teardown();
    }
  });

  it('CA4: POST /:id/scenery (C) → filho tem updatedByRef = C', async () => {
    const { app, teardown } = await makeApp();
    try {
      const planId = await createPlan(app, USER_A);
      const res = await app.inject({
        method: 'POST',
        url: `/api/v2/budget-plans/${planId}/scenery`,
        headers: { authorization: bearer(USER_C) },
        payload: { name: 'Otimista' },
      });
      assert.equal(res.statusCode, 201, res.body);
      const childId = (res.json() as { id: string }).id;
      const children = await app.inject({
        method: 'GET',
        url: `/api/v2/budget-plans/${planId}/children`,
        headers: { authorization: bearer(USER_A) },
      });
      assert.equal(children.statusCode, 200, children.body);
      const child = (children.json() as { items: Item[] }).items.find((i) => i.id === childId);
      assert.ok(child, 'cenário filho presente');
      assert.equal(child?.updatedByRef, USER_C);
    } finally {
      await teardown();
    }
  });

  it('CA1: item expõe o campo updatedByRef (contrato)', async () => {
    const { app, teardown } = await makeApp();
    try {
      await createPlan(app, USER_A);
      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/budget-plans',
        headers: { authorization: bearer(USER_A) },
      });
      const item = (res.json() as { items: Record<string, unknown>[] }).items[0];
      assert.ok(item && 'updatedByRef' in item, 'item deve expor updatedByRef');
    } finally {
      await teardown();
    }
  });
});
