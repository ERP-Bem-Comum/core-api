/**
 * FIN-CANCEL-OPTIMISTIC-LOCK — W0 RED (#55).
 *
 * `cancelDocument` passa a participar do optimistic lock: o DELETE exige `version` no body e
 * rejeita versão defasada com 409 (sem apagar). Hoje o DELETE ignora a versão (cancela sempre) →
 * estes cenários FALHAM (RED). Auth via hooks FAKE (mesmo padrão das demais suites HTTP).
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

const nfseBody = (): Record<string, unknown> => ({
  type: 'NFS-e',
  documentNumber: 'NFS-CANCEL',
  supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  paymentMethod: 'PIX',
  grossValueCents: '100000',
  retentions: [],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
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

const create = async (): Promise<string> => {
  const res = await handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: { authorization: `Bearer ${WRITER}` },
    payload: nfseBody(),
  });
  assert.equal(res.statusCode, 201, res.body);
  return (res.json() as { id: string }).id;
};
const patch = (id: string, version: number) =>
  handle.app.inject({
    method: 'PATCH',
    url: `/api/v2/financial/documents/${id}`,
    headers: { authorization: `Bearer ${WRITER}` },
    payload: { version, grossValueCents: '200000' },
  });
const del = (id: string, version: number | undefined) =>
  handle.app.inject({
    method: 'DELETE',
    url: `/api/v2/financial/documents/${id}`,
    headers: { authorization: `Bearer ${WRITER}` },
    ...(version !== undefined ? { payload: { version } } : {}),
  });
const getDoc = (id: string) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents/${id}`,
    headers: { authorization: `Bearer ${WRITER}` },
  });

interface ErrorBody {
  error: { code: string; message: string; requestId: string };
}

describe('FIN-CANCEL-OPTIMISTIC-LOCK — DELETE exige expectedVersion (#55)', () => {
  it('CA3: DELETE sem version no body → 400', async () => {
    const id = await create();
    const res = await del(id, undefined);
    assert.equal(res.statusCode, 400, res.body);
  });

  it('CA1: DELETE com version corrente (v0) → 204, documento removido', async () => {
    const id = await create();
    const res = await del(id, 0);
    assert.equal(res.statusCode, 204, res.body);
    assert.equal((await getDoc(id)).statusCode, 404);
  });

  it('CA2: DELETE com version defasada → 409 conflict, documento permanece', async () => {
    const id = await create();
    assert.equal((await patch(id, 0)).statusCode, 200); // v0 → v1
    const stale = await del(id, 0); // version defasada
    assert.equal(stale.statusCode, 409, stale.body);
    assert.equal((stale.json() as ErrorBody).error.code, 'conflict');
    assert.equal((await getDoc(id)).statusCode, 200); // não foi apagado
  });
});
