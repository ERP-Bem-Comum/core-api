/**
 * FIN-DELETE-BANK-STATEMENT — borda HTTP: DELETE /financial/bank-statements/:id.
 * Cobre rota + gate (reconciliationImport) + mapa de erros. Extrato inexistente → 404. As guardas de
 * negócio (conciliada/período) estão no teste de use-case; aqui é o wiring HTTP.
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

const IMPORTER = 'reconciliation:import,reconciliation:read';
const PLAIN = 'none';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const SOME_ID = '11111111-1111-4111-8111-111111111111';

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

const del = (perms: string | null) =>
  handle.app.inject({
    method: 'DELETE',
    url: `/api/v2/financial/bank-statements/${SOME_ID}`,
    ...(perms !== null ? { headers: { authorization: `Bearer ${perms}` } } : {}),
  });

describe('DELETE /financial/bank-statements/:id (#FIN-DELETE-BANK-STATEMENT)', () => {
  it('sem token → 401', async () => {
    assert.equal((await del(null)).statusCode, 401);
  });

  it('sem reconciliation:import → 403', async () => {
    assert.equal((await del(PLAIN)).statusCode, 403);
  });

  it('extrato inexistente → 404 (rota + use-case + error-map)', async () => {
    const res = await del(IMPORTER);
    assert.equal(res.statusCode, 404, res.body);
  });
});
