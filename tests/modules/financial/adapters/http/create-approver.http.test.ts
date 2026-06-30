/**
 * FIN-CREATE-APPROVER (#148) — approverRef opcional no create do documento.
 *
 * Registra o aprovador PRETENDIDO junto do documento (a aprovação continua ação separada).
 *  - CA1: create com approverRef → GET ecoa approverRef.
 *  - CA2: create sem approverRef → null (back-compat).
 *  - CA3: approverRef malformado → 400 na borda.
 *
 * Driver memory + hooks de auth FAKE (espelha financial-documents.http.test.ts).
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
const APPROVER = 'a9a9a9a9-a9a9-4a9a-8a9a-a9a9a9a9a9a9';

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

const baseBody = (overrides: Record<string, unknown> = {}) => ({
  type: 'NFS-e',
  documentNumber: 'NFS-APPROVER-001',
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
  asDraft: false,
  ...overrides,
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

const bearer = (perms: string) => ({ authorization: `Bearer ${perms}` });

const postDocument = (body: Record<string, unknown>) =>
  handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: bearer(WRITER),
    payload: body,
  });

const getDocument = (id: string) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents/${id}`,
    headers: bearer(WRITER),
  });

describe('FIN-CREATE-APPROVER — approverRef no create (#148)', () => {
  it('CA1: create com approverRef → GET ecoa approverRef', async () => {
    const createRes = await postDocument(baseBody({ approverRef: APPROVER }));
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const getRes = await getDocument(docId);
    assert.equal(getRes.statusCode, 200, getRes.body);
    assert.equal((getRes.json() as { approverRef: string | null }).approverRef, APPROVER);
  });

  it('CA2: create sem approverRef → null', async () => {
    const createRes = await postDocument(baseBody({ documentNumber: 'NFS-APPROVER-NULL' }));
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const getRes = await getDocument(docId);
    assert.equal((getRes.json() as { approverRef: string | null }).approverRef, null);
  });

  it('CA3: approverRef malformado → 400 na borda', async () => {
    const res = await postDocument(baseBody({ approverRef: 'not-a-uuid' }));
    assert.equal(res.statusCode, 400, res.body);
  });
});
