/**
 * #175 — borda HTTP: GET /statement-transactions/:id/reconciliation (lookup da conciliação ativa).
 * Smoke: rota existe + RBAC + use-case roda. Sem conciliação → 404; sem reconciliation:read → 403.
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

const READER = 'reconciliation:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const TX_ID = '11111111-1111-4111-8111-111111111111';

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

describe('financial/http — lookup conciliação por transação (#175)', () => {
  it('transação sem conciliação ativa → 404 (use-case roda)', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/statement-transactions/${TX_ID}/reconciliation`,
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 404, res.body);
  });

  it('sem permissão reconciliation:read → 403', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/statement-transactions/${TX_ID}/reconciliation`,
      headers: { authorization: 'Bearer fiscal-document:read' },
    });
    assert.equal(res.statusCode, 403, res.body);
  });
});
