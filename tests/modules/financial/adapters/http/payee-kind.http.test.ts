/**
 * FIN-PAYEE-KIND (#90) — rastreio do tipo do favorecido (payeeKind) no documento.
 *
 * O backend já aceita qualquer UUID de parceiro no supplierRef (validação só de formato);
 * o gap é registrar QUAL tipo de parceiro é o favorecido. Esta suíte cobre:
 *  - CA1: create com payeeKind='financier' → GET ecoa payeeKind.
 *  - CA2: create sem payeeKind → default 'supplier' (back-compat).
 *  - CA4: payeeKind inválido → 400 na borda.
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
const FINANCIER = 'f1f1f1f1-f1f1-4f1f-8f1f-f1f1f1f1f1f1';

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
  documentNumber: 'NFS-PAYEE-001',
  supplierRef: FINANCIER, // favorecido é um financiador (id de parceiro qualquer — formato UUID)
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

describe('FIN-PAYEE-KIND — payeeKind no documento (#90)', () => {
  it('CA1: create com payeeKind=financier → GET ecoa payeeKind', async () => {
    const createRes = await postDocument(baseBody({ payeeKind: 'financier' }));
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const getRes = await getDocument(docId);
    assert.equal(getRes.statusCode, 200, getRes.body);
    const detail = getRes.json() as { payeeKind: string | null; supplierRef: string };
    assert.equal(detail.payeeKind, 'financier');
    assert.equal(detail.supplierRef, FINANCIER);
  });

  it('CA2: create sem payeeKind → default supplier', async () => {
    const createRes = await postDocument(baseBody({ documentNumber: 'NFS-PAYEE-DEF' }));
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const getRes = await getDocument(docId);
    assert.equal(getRes.statusCode, 200, getRes.body);
    assert.equal((getRes.json() as { payeeKind: string | null }).payeeKind, 'supplier');
  });

  it('CA4: payeeKind inválido → 400 na borda', async () => {
    const res = await postDocument(baseBody({ payeeKind: 'fornecedor' }));
    assert.equal(res.statusCode, 400, res.body);
  });
});
