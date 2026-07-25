/**
 * FIN-DOC-PARSE-ONLY — W0 (RED) — #580: smoke HTTP do parse-only. A rota existe, valida magic-bytes,
 * devolve o DTO de campos e NÃO cria documento. (A lógica de extração/resolução é coberta no teste de
 * use case parse-document.test.ts; aqui é a fiação da borda + o contrato de resposta.)
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

const parse = (mimeType: string, payload: Buffer) =>
  handle.app.inject({
    method: 'POST',
    url: `/api/v2/financial/documents/parse?mimeType=${encodeURIComponent(mimeType)}`,
    headers: { authorization: `Bearer ${WRITER}`, 'content-type': 'application/octet-stream' },
    payload,
  });

describe('FIN-DOC-PARSE-ONLY — POST /documents/parse (#580)', () => {
  it('CA1 — XML → 200 com o contrato de campos (memory: supplierRef null, sem persistir)', async () => {
    const res = await parse('text/xml', Buffer.from('<nfse><n>1</n></nfse>', 'utf8'));
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as Record<string, unknown>;
    // Contrato: as chaves existem (auto-fill do front). Sem partners (memory) → supplierRef null.
    assert.equal('supplierRef' in body, true);
    assert.equal('type' in body, true);
    assert.equal('documentNumber' in body, true);
    assert.equal(Array.isArray(body.retentions), true);
    assert.equal(body.supplierRef, null);
    // Não devolve id de documento (não cria nada).
    assert.equal('id' in body, false);
  });

  it('CA2 — magic-bytes não batem (mimeType pdf, bytes xml) → 400', async () => {
    const res = await parse('application/pdf', Buffer.from('<nfse/>', 'utf8'));
    assert.equal(res.statusCode, 400, res.body);
  });
});
