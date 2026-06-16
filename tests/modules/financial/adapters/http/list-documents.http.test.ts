/**
 * FIN-LISTAGEM-TIMELINE — W0 RED da borda GET /api/v2/financial/documents (listagem real).
 *
 * Hoje o handler é STUB (devolve sempre { items: [], total: 0 }). Estes cenários criam documentos
 * e esperam o conjunto/total reais filtrados → FALHAM contra o stub (RED). Auth via hooks FAKE
 * (mesmo padrão de financial-documents.http.test.ts — sem rate-limit).
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
const PLAIN = 'none';

const requireAuth: preHandlerAsyncHookHandler = async (req, reply) => {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ error: { code: 'unauthorized', message: 'sem token' } });
  }
  (req as unknown as { userId: string }).userId = '99999999-9999-4999-8999-999999999999';
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

const nfseBody = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  type: 'NFS-e',
  documentNumber: 'NFS-001',
  supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  paymentMethod: 'PIX',
  grossValueCents: '100000',
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
  const deps = await buildFinancialHttpDeps({ driver: 'memory' });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(deps, { requireAuth, authorize })],
  });
  handle = {
    app,
    teardown: async () => {
      await app.close();
      await deps.shutdown();
    },
  };
});
after(async () => {
  await handle.teardown();
});

const post = (body: Record<string, unknown>) =>
  handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: { authorization: `Bearer ${WRITER}` },
    payload: body,
  });
const list = (query: string, perms = WRITER) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents${query}`,
    headers: { authorization: `Bearer ${perms}` },
  });

describe('FIN-LISTAGEM-TIMELINE — GET /api/v2/financial/documents (listagem real)', () => {
  it('CT-001: lista documentos Open criados (não vazio)', async () => {
    const created = await post(nfseBody());
    assert.equal(created.statusCode, 201, created.body);

    const res = await list('?status=Open&page=1&pageSize=20');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: unknown[]; total: number };
    assert.ok(body.total >= 1, 'total deve refletir o documento criado');
    assert.ok(body.items.length >= 1, 'items não pode ser vazio');
  });

  it('CT-003: filtra por supplierRef', async () => {
    await post(nfseBody({ supplierRef: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }));
    const res = await list('?supplierRef=bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: { supplierRef: string }[]; total: number };
    assert.ok(body.total >= 1);
    assert.ok(body.items.every((i) => i.supplierRef === 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'));
  });

  it('CT-007: supplierRef malformado → 400', async () => {
    const res = await list('?supplierRef=not-a-uuid');
    assert.equal(res.statusCode, 400, res.body);
  });

  it('CT-008: sem fiscal-document:read → 403', async () => {
    const res = await list('?status=Open', PLAIN);
    assert.equal(res.statusCode, 403);
  });

  it('CT-009: type inválido (fora do enum) → 400', async () => {
    const res = await list('?type=FOO');
    assert.equal(res.statusCode, 400, res.body);
  });
});
