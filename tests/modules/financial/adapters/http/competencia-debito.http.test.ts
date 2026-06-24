/**
 * #197 — competência (YYYY-MM) + conta-débito no create. competência inválida → 422; contaDebitoRef
 * inexistente → 422 (by-identity); válidos → persistem e aparecem no GET /:id. Driver memory; auth FAKE.
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

const TOKEN = 'fiscal-document:write,fiscal-document:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const SUP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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

const nfseBody = (over: Record<string, unknown> = {}) => ({
  type: 'NFS-e',
  documentNumber: 'NFS-197',
  supplierRef: SUP,
  paymentMethod: 'PIX',
  grossValueCents: '1000000',
  sourceDiscountsCents: '0',
  discountsCents: '0',
  penaltyCents: '0',
  interestCents: '0',
  retentions: [],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
  ...over,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const financialDeps = await buildFinancialHttpDeps({ driver: 'memory' });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(financialDeps, { requireAuth, authorize })],
  });
  handle = {
    app,
    teardown: async () => {
      await app.close();
      await financialDeps.shutdown();
    },
  };
});

after(async () => {
  await handle.teardown();
});

describe('financial/http — competência + conta-débito (#197)', () => {
  it('CA: competência YYYY-MM válida → 201 e GET /:id expõe', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: nfseBody({ competencia: '2026-06' }),
    });
    assert.equal(created.statusCode, 201, created.body);
    const id = (created.json() as { id: string }).id;

    const detail = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/documents/${id}`,
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(detail.statusCode, 200, detail.body);
    assert.equal((detail.json() as { competencia: string | null }).competencia, '2026-06');
  });

  it('CA: competência inválida → 422 invalid-competencia', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: nfseBody({ competencia: '2026-13' }),
    });
    assert.equal(res.statusCode, 422, res.body);
  });

  it('CA: contaDebitoRef inexistente → 422 (by-identity)', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: nfseBody({ contaDebitoRef: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }),
    });
    assert.equal(res.statusCode, 422, res.body);
  });
});
