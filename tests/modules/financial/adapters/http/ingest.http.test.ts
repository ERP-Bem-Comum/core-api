/**
 * #62 fatia 2 — POST /api/v2/financial/documents/ingest. Upload seguro (octet-stream + magic-bytes +
 * mime allowlist + auth) → ingestDocument (lê + guarda + rascunho). Driver memory; auth FAKE.
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
import { buildNativePdf, buildBombPdf } from '../document-reader/_fixtures/pdf-builder.ts';

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

const PDF = Buffer.from(buildNativePdf(['NOTA FISCAL DE SERVICOS NFS-e', 'Numero: 0001']));
const URL = '/api/v2/financial/documents/ingest';
const OCTET = { 'content-type': 'application/octet-stream' };

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
  handle = { app, teardown: async () => app.close() };
});
after(async () => handle.teardown());

describe('POST /financial/documents/ingest (#62)', () => {
  it('CA1: PDF válido + auth write → 201 { documentId }', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: `${URL}?fileName=nota.pdf&mimeType=application%2Fpdf`,
      headers: { ...OCTET, authorization: 'Bearer fiscal-document:write' },
      payload: PDF,
    });
    assert.equal(res.statusCode, 201);
    const body = res.json() as { documentId?: string };
    assert.equal(typeof body.documentId, 'string');
  });

  it('CA2: sem token → 401; sem permissão write → 403', async () => {
    const noAuth = await handle.app.inject({
      method: 'POST',
      url: `${URL}?fileName=nota.pdf&mimeType=application%2Fpdf`,
      headers: OCTET,
      payload: PDF,
    });
    assert.equal(noAuth.statusCode, 401);
    const noPerm = await handle.app.inject({
      method: 'POST',
      url: `${URL}?fileName=nota.pdf&mimeType=application%2Fpdf`,
      headers: { ...OCTET, authorization: 'Bearer fiscal-document:read' },
      payload: PDF,
    });
    assert.equal(noPerm.statusCode, 403);
  });

  it('CA3: mimeType fora da allowlist → 400', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: `${URL}?fileName=x.exe&mimeType=application%2Fx-msdownload`,
      headers: { ...OCTET, authorization: 'Bearer fiscal-document:write' },
      payload: PDF,
    });
    assert.equal(res.statusCode, 400);
  });

  it('CA4: mimeType=application/pdf mas body não é PDF → magic-bytes mismatch', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: `${URL}?fileName=fake.pdf&mimeType=application%2Fpdf`,
      headers: { ...OCTET, authorization: 'Bearer fiscal-document:write' },
      payload: Buffer.from('nao sou um pdf'),
    });
    assert.notEqual(res.statusCode, 201);
    assert.ok(res.statusCode >= 400 && res.statusCode < 500);
  });

  it('CA7: erro de recurso do reader (bomba de descompressão) → 413', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: `${URL}?fileName=bomb.pdf&mimeType=application%2Fpdf`,
      headers: { ...OCTET, authorization: 'Bearer fiscal-document:write' },
      payload: Buffer.from(buildBombPdf(12 * 1024 * 1024)),
    });
    assert.equal(res.statusCode, 413);
  });

  it('M2: mimeType=text/xml mas body não começa com "<" → magic-bytes mismatch (4xx)', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: `${URL}?fileName=fake.xml&mimeType=text%2Fxml`,
      headers: { ...OCTET, authorization: 'Bearer fiscal-document:write' },
      payload: Buffer.from('lixo binario que nao e xml'),
    });
    assert.notEqual(res.statusCode, 201);
    assert.ok(res.statusCode >= 400 && res.statusCode < 500);
  });

  it('m1: fileName = ".." → 400 (Zod veta traversal na borda)', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: `${URL}?fileName=..&mimeType=application%2Fpdf`,
      headers: { ...OCTET, authorization: 'Bearer fiscal-document:write' },
      payload: PDF,
    });
    assert.equal(res.statusCode, 400);
  });
});
