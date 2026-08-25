/**
 * FIN-DOC-SOURCEFILE-VIEW — W0 (RED) — o comprovante-fonte lido na ingestão (#62) precisa VOLTAR ao
 * front: hoje a área de OCR da tela de edição reabre vazia mesmo com lançamento feito por leitura.
 *
 * A ref É persistida (ingest → saveDraft grava as colunas source_file_*), mas:
 *  1. `GET /documents/:id` NÃO expõe o anexo → o front não sabe que há arquivo (badge + área OCR).
 *  2. Não há endpoint que devolva os BYTES → a área de OCR não tem o que renderizar.
 *
 * Cobre via fastify.inject (memory + in-memory storage): expõe `attachment` no detalhe e serve o
 * arquivo INLINE (sem download). Sem anexo → 404.
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

// XML mínimo — magic-bytes '<' passa; o reader pode falhar (classe 'read') mas o arquivo é guardado.
const XML = '<nfse><n>1</n></nfse>';

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

const ingestXml = (fileName: string) =>
  handle.app.inject({
    method: 'POST',
    url: `/api/v2/financial/documents/ingest?fileName=${encodeURIComponent(fileName)}&mimeType=text%2Fxml`,
    headers: { authorization: `Bearer ${WRITER}`, 'content-type': 'application/octet-stream' },
    payload: Buffer.from(XML, 'utf8'),
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

describe('FIN-DOC-SOURCEFILE-VIEW — anexo no detalhe + servir inline', () => {
  it('CA1 — GET /documents/:id expõe `attachment` do comprovante-fonte', async () => {
    const ing = await ingestXml('nota.xml');
    assert.equal(ing.statusCode, 201, ing.body);
    const id = (ing.json() as { documentId: string }).documentId;

    const res = await getDocument(id);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      attachment: {
        fileName: string;
        mimeType: string;
        sizeBytes: number;
        url: string;
      } | null;
    };
    assert.notEqual(body.attachment, null, 'attachment deveria estar presente');
    assert.equal(body.attachment?.fileName, 'nota.xml');
    assert.equal(body.attachment?.mimeType, 'text/xml');
    assert.equal(body.attachment?.sizeBytes, Buffer.byteLength(XML, 'utf8'));
    assert.equal(body.attachment?.url, `/api/v2/financial/documents/${id}/source-file`);
  });

  it('CA2 — GET /documents/:id/source-file devolve os bytes INLINE', async () => {
    const ing = await ingestXml('nota.xml');
    const id = (ing.json() as { documentId: string }).documentId;

    const res = await getSourceFile(id);
    assert.equal(res.statusCode, 200, res.body);
    assert.match(String(res.headers['content-type']), /text\/xml/);
    assert.match(String(res.headers['content-disposition']), /inline/);
    assert.match(String(res.headers['content-disposition']), /nota\.xml/);
    assert.equal(res.rawPayload.toString('utf8'), XML);
  });

  it('CA3 — documento SEM anexo: attachment null e source-file → 404', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: { asDraft: true, type: 'NFS-e' },
    });
    assert.equal(created.statusCode, 201, created.body);
    const id = (created.json() as { id: string }).id;

    const detail = await getDocument(id);
    assert.equal((detail.json() as { attachment: unknown }).attachment, null);

    const res = await getSourceFile(id);
    assert.equal(res.statusCode, 404, res.body);
  });
});
