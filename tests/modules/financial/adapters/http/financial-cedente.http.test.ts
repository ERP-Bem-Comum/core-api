/**
 * W0 RED (019) — borda HTTP /api/v2/financial/cedente-accounts (CRUD + close).
 * As rotas ainda não existem no plugin → inject retorna 404, falhando os asserts de 201/200/403.
 * Driver memory; auth via hooks FAKE (mesmo padrão de financial-reconciliation.http.test.ts).
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

const WRITER = 'bank-account:write,bank-account:read';
const READER = 'bank-account:read';
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

const body = (over: Record<string, unknown> = {}) => ({
  bankCode: '237',
  bankName: 'Bradesco',
  type: 'corrente',
  agency: '1234',
  accountNumber: '567890',
  accountDigit: '1',
  document: '12345678000190',
  nickname: 'Conta principal',
  ...over,
});

describe('financial/http — cedente-accounts (019) — W0 RED', () => {
  it('CA-US1: POST /cedente-accounts → 201', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: body(),
    });
    assert.equal(res.statusCode, 201, res.body);
  });

  it('CA-US1: GET /cedente-accounts → 200 (lista)', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
  });

  it('CA-US2: POST /cedente-accounts/:id/close → rota existe (≠ 404)', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const res = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/cedente-accounts/${id}/close`,
      headers: { authorization: `Bearer ${WRITER}` },
    });
    assert.notEqual(res.statusCode, 404, `rota close deve existir (status=${res.statusCode})`);
  });

  it('CA-US1: POST sem permissão write → 403', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${READER}` },
      payload: body(),
    });
    assert.equal(res.statusCode, 403, res.body);
  });
});
