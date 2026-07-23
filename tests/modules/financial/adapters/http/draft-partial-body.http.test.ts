/**
 * FIN-DRAFT-PARTIAL-SCHEMA — W0 (RED) — #534: rascunho parcial deve ser aceito na borda HTTP.
 *
 * `createDocumentBodySchema` exige 5 campos mesmo com `asDraft:true`, mas o domínio `saveDraft`
 * aceita rascunho parcial. Hoje um corpo parcial com `asDraft:true` toma 400 antes de chegar no
 * domínio — o botão "Salvar rascunho" fica travado. Cobre CA1..CA3 via fastify.inject (memory).
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

const postDocument = (body: Record<string, unknown>) =>
  handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: { authorization: `Bearer ${WRITER}` },
    payload: body,
  });

describe('FIN-DRAFT-PARTIAL-SCHEMA — rascunho parcial (#534)', () => {
  it('CA1 — asDraft:true só com `type` → 201 + status Draft', async () => {
    const res = await postDocument({ asDraft: true, type: 'NFS-e' });
    assert.equal(res.statusCode, 201, res.body);
    assert.equal((res.json() as { status: string }).status, 'Draft');
  });

  it('CA2 — asDraft:true só com `documentNumber` → 201 (não é campo-específico)', async () => {
    const res = await postDocument({ asDraft: true, documentNumber: 'RASC-001' });
    assert.equal(res.statusCode, 201, res.body);
    assert.equal((res.json() as { status: string }).status, 'Draft');
  });

  it('CA3 — asDraft:false sem os obrigatórios → 400 (inalterado)', async () => {
    const res = await postDocument({ asDraft: false, type: 'NFS-e' });
    assert.equal(res.statusCode, 400, res.body);
  });
});
