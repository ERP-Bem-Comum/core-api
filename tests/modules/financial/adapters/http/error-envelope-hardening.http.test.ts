/**
 * FIN-HTTP-ERROR-PUBLIC-CODE — W0 RED (#52, OWASP API8:2023) end-to-end.
 *
 * 4xx do financial deve expor `code` público (conflict/not-found/bad-request/unprocessable)
 * e `message` PT-BR; o slug interno NUNCA aparece no body. RED enquanto o plugin ecoa o slug.
 * Auth via hooks FAKE (mesmo padrão das demais suites HTTP).
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
const APPROVER = `${WRITER},payable:approve`;

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
  documentNumber: 'NFS-OL',
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
const approve = (id: string, version: number) =>
  handle.app.inject({
    method: 'POST',
    url: `/api/v2/financial/documents/${id}/approve`,
    headers: { authorization: `Bearer ${APPROVER}` },
    payload: { version },
  });

interface ErrorBody {
  error: { code: string; message: string; requestId: string };
}

describe('FIN-HTTP-ERROR-PUBLIC-CODE — mascaramento 4xx (#52)', () => {
  it('CA1: PATCH version stale → 409 code:"conflict" sem slug, message PT-BR', async () => {
    const id = await create();
    assert.equal((await patch(id, 0)).statusCode, 200); // v1
    const stale = await patch(id, 0); // stale
    assert.equal(stale.statusCode, 409, stale.body);
    const { error } = stale.json() as ErrorBody;
    assert.equal(error.code, 'conflict');
    assert.notEqual(error.code, 'document-version-conflict');
    assert.notEqual(error.message, 'document-version-conflict');
    assert.ok(error.message.length > 0);
  });

  it('CA2: approve sobre Approved → 409 conflict, slug invalid-state-transition oculto', async () => {
    const id = await create();
    assert.equal((await patch(id, 0)).statusCode, 200); // v1
    assert.equal((await approve(id, 1)).statusCode, 200); // v2 Approved
    const again = await approve(id, 2); // invalid-state-transition
    assert.equal(again.statusCode, 409, again.body);
    const { error } = again.json() as ErrorBody;
    assert.equal(error.code, 'conflict');
    assert.notEqual(error.message, 'invalid-state-transition');
  });

  it('CA3: GET documento inexistente → 404 not-found sem slug', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/documents/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      headers: { authorization: `Bearer ${WRITER}` },
    });
    assert.equal(res.statusCode, 404, res.body);
    const { error } = res.json() as ErrorBody;
    assert.equal(error.code, 'not-found');
    assert.notEqual(error.message, 'document-not-found');
  });

  it('CA4: POST sem dueDate (não-draft) → 422 unprocessable sem slug', async () => {
    const { dueDate: _omit, ...noDue } = nfseBody();
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: noDue,
    });
    assert.equal(res.statusCode, 422, res.body);
    const { error } = res.json() as ErrorBody;
    assert.equal(error.code, 'unprocessable');
    assert.notEqual(error.message, 'document-incomplete');
  });
});
