/**
 * W0 RED (020-fin-categorization-ref · US1) — borda HTTP: GET /api/v2/financial/categories.
 * Smoke: rota existe + RBAC. Com `reference:read` → 200 com [{id,name,group}] agrupado;
 * sem a permissão → 403. (contracts/categorization-read.md · FR-001/005, slug T005 = reference:read.)
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';

const READER = 'reference:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const GROUPS = ['despesa', 'receita', 'ajuste'];

const requireAuth: preHandlerAsyncHookHandler = async (req, reply) => {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ error: { code: 'unauthorized', message: 'sem token' } });
  }
  (req as unknown as { userId: string }).userId = TEST_USER_ID;
  return undefined;
};
const authorize =
  (permission: string): preHandlerAsyncHookHandler =>
  async (req, reply) => {
    const perms = (req.headers.authorization ?? '').replace('Bearer ', '').split(',');
    if (!perms.includes(permission)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'sem permissão' } });
    }
    return undefined;
  };

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const base = await buildFinancialHttpDeps({ driver: 'memory' });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(base, { requireAuth, authorize })],
  });
  handle = {
    app,
    teardown: async () => {
      await app.close();
      await base.shutdown();
    },
  };
});

after(async () => {
  await handle.teardown();
});

describe('financial/http — GET /categories (020 · US1)', () => {
  it('reference:read → 200 com [{id,name,group}] agrupado por natureza', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/categories',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as readonly { id: string; name: string; group: string }[];
    assert.ok(body.length >= 1, 'seed in-memory deve popular categorias de referência');
    for (const item of body) {
      assert.equal(typeof item.id, 'string');
      assert.ok(item.name.length > 0);
      assert.ok(GROUPS.includes(item.group), `group inválido: ${item.group}`);
    }
    assert.ok(
      body.some((c) => c.group === 'despesa'),
      'deve haver ao menos um grupo despesa (agrupamento FR-005)',
    );
  });

  it('sem reference:read → 403', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/categories',
      headers: { authorization: 'Bearer fiscal-document:read' },
    });
    assert.equal(res.statusCode, 403, res.body);
  });
});
