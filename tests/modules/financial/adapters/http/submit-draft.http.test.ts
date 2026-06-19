/**
 * #91 — borda HTTP: finalizar rascunho (Draft → Open) via POST /documents/:id/submit.
 * O use-case submitDraft já existe e está wired; faltava a rota. Driver memory; auth via hooks FAKE.
 * W0 RED: a rota não existe → inject retorna 404, falhando o assert de 200.
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

const WRITER = 'fiscal-document:write,fiscal-document:read';
const READER = 'fiscal-document:read';
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
  documentNumber: 'NFS-SUBMIT-1',
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

const createDraft = async (): Promise<string> => {
  const res = await handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: { authorization: `Bearer ${WRITER}` },
    payload: draftBody(),
  });
  assert.equal(res.statusCode, 201, res.body);
  return (res.json() as { id: string }).id;
};

describe('financial/http — submitDraft (#91) — W0 RED', () => {
  it('POST /documents/:id/submit → 200 e o documento vira Open', async () => {
    const id = await createDraft();
    const res = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${id}/submit`,
      headers: { authorization: `Bearer ${WRITER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal((res.json() as { status: string }).status, 'Open');
  });

  it('POST submit sem permissão write → 403', async () => {
    const id = await createDraft();
    const res = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${id}/submit`,
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 403, res.body);
  });
});
