/**
 * FIN-DOC-SOURCEFILE-CREATE — W0 (RED) — #577: anexar o comprovante NO create/save-draft, em UMA
 * chamada atômica, sem depender do ingest→rascunho-fantasma.
 *
 * Opção A (base64 no JSON) numa ROTA DEDICADA e SUB-SCOPADA (bodyLimit isolado, como o #62 fez com o
 * ingest octet-stream): POST /financial/documents/with-source-file. O comprovante nasce no MESMO
 * documento que o usuário salva (rascunho OU Open) → GET /:id expõe `attachment` e /:id/source-file
 * serve os bytes.
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

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}

let handle: AppHandle;

const XML = '<nfse><n>1</n></nfse>';
const XML_B64 = Buffer.from(XML, 'utf8').toString('base64');

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

const createWithFile = (body: Record<string, unknown>) =>
  handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents/with-source-file',
    headers: { authorization: `Bearer ${WRITER}` },
    payload: body,
  });

const getDocument = (id: string) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents/${id}`,
    headers: { authorization: `Bearer ${WRITER}` },
  });

const getSourceFile = (id: string) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents/${id}/source-file`,
    headers: { authorization: `Bearer ${WRITER}` },
  });

const openBody = (overrides: Record<string, unknown> = {}) => ({
  type: 'NFS-e',
  documentNumber: 'NFS-001',
  supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  paymentMethod: 'PIX',
  grossValueCents: '100000',
  sourceDiscountsCents: '0',
  discountsCents: '0',
  penaltyCents: '0',
  interestCents: '0',
  retentions: [{ type: 'ISS', baseCents: '100000', rateBps: 300, valueCents: '3000' }],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
  ...overrides,
});

const SOURCE_FILE = { fileName: 'nota.xml', mimeType: 'text/xml', base64: XML_B64 };

describe('FIN-DOC-SOURCEFILE-CREATE — anexar comprovante no create (#577)', () => {
  it('CA1 — asDraft:true + sourceFile → rascunho com attachment + bytes servidos', async () => {
    const res = await createWithFile({ asDraft: true, type: 'NFS-e', sourceFile: SOURCE_FILE });
    assert.equal(res.statusCode, 201, res.body);
    const id = (res.json() as { id: string }).id;

    const detail = await getDocument(id);
    const att = (detail.json() as { attachment: { fileName: string; mimeType: string } | null })
      .attachment;
    assert.notEqual(att, null);
    assert.equal(att?.fileName, 'nota.xml');
    assert.equal(att?.mimeType, 'text/xml');

    const sf = await getSourceFile(id);
    assert.equal(sf.statusCode, 200, sf.body);
    assert.equal(sf.rawPayload.toString('utf8'), XML);
  });

  it('CA2 — asDraft:false + sourceFile → documento Open com attachment', async () => {
    const res = await createWithFile(openBody({ sourceFile: SOURCE_FILE }));
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as { id: string; status: string; attachment: unknown };
    assert.equal(body.status, 'Open');
    assert.notEqual(body.attachment, null);

    const sf = await getSourceFile(body.id);
    assert.equal(sf.statusCode, 200, sf.body);
    assert.equal(sf.rawPayload.toString('utf8'), XML);
  });

  it('CA3 — sem sourceFile → cria normal, attachment null, sem erro', async () => {
    const res = await createWithFile({ asDraft: true, type: 'NFS-e' });
    assert.equal(res.statusCode, 201, res.body);
    const id = (res.json() as { id: string }).id;
    const detail = await getDocument(id);
    assert.equal((detail.json() as { attachment: unknown }).attachment, null);
  });

  it('CA4 — magic-bytes não batem com o mimeType → 4xx (não grava)', async () => {
    const res = await createWithFile({
      asDraft: true,
      type: 'NFS-e',
      // declara PDF mas manda XML → magic '%PDF' não casa
      sourceFile: { fileName: 'falso.pdf', mimeType: 'application/pdf', base64: XML_B64 },
    });
    assert.equal(res.statusCode >= 400 && res.statusCode < 500, true, res.body);
  });
});
