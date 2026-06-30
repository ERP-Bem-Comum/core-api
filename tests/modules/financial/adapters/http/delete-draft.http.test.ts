/**
 * #166 — borda HTTP: DELETE de documento em RASCUNHO (Draft).
 * Antes: DELETE só aceitava Open → 409 em Draft. Agora aceita Draft (hard delete, sem títulos-filho).
 * Driver memory; auth via hooks FAKE.
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

const WRITER = 'fiscal-document:write,fiscal-document:read,fiscal-document:cancel';
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

const draftBody = () => ({
  type: 'NFS-e',
  documentNumber: 'NFS-DEL-1',
  supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  paymentMethod: 'PIX',
  grossValueCents: '100000',
  sourceDiscountsCents: '0',
  discountsCents: '0',
  penaltyCents: '0',
  interestCents: '0',
  retentions: [],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: true,
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

describe('financial/http — DELETE documento em Draft (#166)', () => {
  it('cria rascunho, DELETE → 204 e some do GET', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: draftBody(),
    });
    assert.equal(created.statusCode, 201, created.body);
    const body = created.json() as { id: string; status: string; version: number };
    assert.equal(body.status, 'Draft');

    const del = await handle.app.inject({
      method: 'DELETE',
      url: `/api/v2/financial/documents/${body.id}`,
      headers: { authorization: `Bearer ${WRITER}` },
      payload: { version: body.version },
    });
    assert.equal(del.statusCode, 204, del.body);

    const got = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/documents/${body.id}`,
      headers: { authorization: `Bearer ${WRITER}` },
    });
    assert.equal(got.statusCode, 404, got.body);
  });
});
