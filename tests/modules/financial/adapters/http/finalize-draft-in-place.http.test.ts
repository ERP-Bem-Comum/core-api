/**
 * FIN-FINALIZE-DRAFT-IN-PLACE — W0 (RED) — #579: finalizar rascunho PROMOVE no lugar (mesmo id →
 * Draft vira Open), com os campos revisados e o comprovante preservados. Sem doc novo (duplicata).
 *
 * O `POST /documents/:id/submit` passa a aceitar os campos revisados no corpo → atualiza o rascunho
 * (upsert por id, preservando o sourceFileRef) e promove numa chamada. Sem corpo → promove como está.
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

const XML_B64 = Buffer.from('<nfse><n>1</n></nfse>', 'utf8').toString('base64');

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

const post = (url: string, body: Record<string, unknown>) =>
  handle.app.inject({
    method: 'POST',
    url: `/api/v2/financial${url}`,
    headers: { authorization: `Bearer ${WRITER}` },
    payload: body,
  });

const submit = (id: string, body?: Record<string, unknown>) =>
  handle.app.inject({
    method: 'POST',
    url: `/api/v2/financial/documents/${id}/submit`,
    headers: { authorization: `Bearer ${WRITER}` },
    ...(body !== undefined ? { payload: body } : {}),
  });

const getDoc = (id: string) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents/${id}`,
    headers: { authorization: `Bearer ${WRITER}` },
  });

// Campos que completam um Open válido (revisados na tela).
const reviewedOpenFields = () => ({
  type: 'NFS-e',
  documentNumber: 'NFS-777',
  supplierRef: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  paymentMethod: 'PIX',
  grossValueCents: '150000',
  dueDate: '2026-12-31',
});

describe('FIN-FINALIZE-DRAFT-IN-PLACE — submit promove no lugar (#579)', () => {
  it('CA1 — rascunho parcial + submit com campos revisados → MESMO id vira Open (sem duplicata)', async () => {
    const created = await post('/documents', { asDraft: true, type: 'NFS-e' });
    assert.equal(created.statusCode, 201, created.body);
    const draftId = (created.json() as { id: string; status: string }).id;
    assert.equal((created.json() as { status: string }).status, 'Draft');

    const res = await submit(draftId, reviewedOpenFields());
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { id: string; status: string; supplierRef: string | null };
    assert.equal(body.id, draftId); // MESMO id — promovido no lugar, sem doc novo
    assert.equal(body.status, 'Open');
    assert.equal(body.supplierRef, 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'); // campo revisado aplicado
  });

  it('CA2 — rascunho com comprovante + submit preserva o attachment', async () => {
    const created = await post('/documents/with-source-file', {
      asDraft: true,
      type: 'NFS-e',
      sourceFile: { fileName: 'nota.xml', mimeType: 'text/xml', base64: XML_B64 },
    });
    assert.equal(created.statusCode, 201, created.body);
    const draftId = (created.json() as { id: string }).id;

    const res = await submit(draftId, reviewedOpenFields());
    assert.equal(res.statusCode, 200, res.body);
    assert.equal((res.json() as { status: string }).status, 'Open');

    const detail = await getDoc(draftId);
    assert.notEqual((detail.json() as { attachment: unknown }).attachment, null);
  });

  it('CA3 — submit SEM corpo (rascunho já completo) → promove como está (backward-compat)', async () => {
    const created = await post('/documents', { asDraft: true, ...reviewedOpenFields() });
    assert.equal(created.statusCode, 201, created.body);
    const draftId = (created.json() as { id: string }).id;

    const res = await submit(draftId);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { id: string; status: string };
    assert.equal(body.id, draftId);
    assert.equal(body.status, 'Open');
  });
});
