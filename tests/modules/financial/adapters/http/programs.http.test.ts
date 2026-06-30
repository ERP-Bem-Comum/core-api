/**
 * W0 RED (020-fin-categorization-ref · US3) — borda HTTP: GET /api/v2/financial/programs.
 * Passthrough do ProgramReadPort (consumo cross-módulo de programs/public-api). Smoke: rota + RBAC.
 * Com `reference:read` → 200 com [{id,name}]; sem a permissão → 403. (FR-003 / contracts.)
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

describe('financial/http — GET /programs (020 · US3)', () => {
  it('reference:read → 200 com [{id,name}] (passthrough da fonte canônica)', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/programs',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as readonly { id: string; name: string }[];
    assert.ok(body.length >= 1, 'stub in-memory deve popular programas');
    for (const item of body) {
      assert.equal(typeof item.id, 'string');
      assert.ok(item.name.length > 0);
    }
  });

  it('sem reference:read → 403', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/programs',
      headers: { authorization: 'Bearer fiscal-document:read' },
    });
    assert.equal(res.statusCode, 403, res.body);
  });
});
