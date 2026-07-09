/**
 * FIN-DOC-BULK-DUEDATE (#162) — W0 RED da borda PATCH /api/v2/financial/documents/due-date.
 *
 * Alteração de vencimento em LOTE com falha parcial por item (ok/version-conflict/not-found).
 * Auth via hooks FAKE (mesmo padrão de list-documents.http.test.ts — sem rate-limit).
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
  documentNumber: 'BULK-001',
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

const post = async (body: Record<string, unknown>): Promise<string> => {
  const res = await handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: { authorization: `Bearer ${WRITER}` },
    payload: body,
  });
  assert.equal(res.statusCode, 201, res.body);
  return (res.json() as { id: string }).id;
};
const bulk = (body: unknown, perms = WRITER) =>
  handle.app.inject({
    method: 'PATCH',
    url: '/api/v2/financial/documents/due-date',
    headers: { authorization: `Bearer ${perms}` },
    payload: body as Record<string, unknown>,
  });
const getDoc = async (id: string): Promise<{ dueDate: string | null }> => {
  const res = await handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents/${id}`,
    headers: { authorization: `Bearer ${WRITER}` },
  });
  assert.equal(res.statusCode, 200, res.body);
  return res.json() as { dueDate: string | null };
};

describe('FIN-DOC-BULK-DUEDATE — PATCH /api/v2/financial/documents/due-date', () => {
  it('CA1: lote de 3 válidos → todos ok; nova dueDate refletida', async () => {
    const ids = [
      await post(
        nfseBody({ documentNumber: 'BULK-A', supplierRef: '11111111-1111-4111-8111-111111111111' }),
      ),
      await post(
        nfseBody({ documentNumber: 'BULK-B', supplierRef: '11111111-1111-4111-8111-111111111111' }),
      ),
      await post(
        nfseBody({ documentNumber: 'BULK-C', supplierRef: '11111111-1111-4111-8111-111111111111' }),
      ),
    ];
    const res = await bulk({ items: ids.map((id) => ({ id, version: 0 })), dueDate: '2027-01-15' });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { results: { documentId: string; outcome: string }[] };
    assert.equal(body.results.length, 3);
    assert.ok(
      body.results.every((r) => r.outcome === 'ok'),
      'todos ok',
    );
    for (const id of ids) assert.equal((await getDoc(id)).dueDate, '2027-01-15');
  });

  it('CA2: version stale → version-conflict só naquele id; demais aplicados', async () => {
    const a = await post(
      nfseBody({ documentNumber: 'BULK-V-A', supplierRef: '22222222-2222-4222-8222-222222222222' }),
    );
    const b = await post(
      nfseBody({ documentNumber: 'BULK-V-B', supplierRef: '22222222-2222-4222-8222-222222222222' }),
    );
    // Bump da versão de `a` (0 → 1) via um bulk isolado.
    await bulk({ items: [{ id: a, version: 0 }], dueDate: '2027-02-01' });
    // Agora `a` está em v1; enviar v0 (stale) para `a` e v0 (válido) para `b`.
    const res = await bulk({
      items: [
        { id: a, version: 0 },
        { id: b, version: 0 },
      ],
      dueDate: '2027-03-03',
    });
    assert.equal(res.statusCode, 200, res.body);
    const byId = new Map(
      (res.json() as { results: { documentId: string; outcome: string }[] }).results.map((r) => [
        r.documentId,
        r.outcome,
      ]),
    );
    assert.equal(byId.get(a), 'version-conflict', 'a stale → conflito');
    assert.equal(byId.get(b), 'ok', 'b válido → aplicado');
    assert.equal((await getDoc(b)).dueDate, '2027-03-03');
    assert.equal((await getDoc(a)).dueDate, '2027-02-01', 'a não muda (conflito)');
  });

  it('CA3: id inexistente → not-found só naquele id; demais aplicados', async () => {
    const ok1 = await post(
      nfseBody({ documentNumber: 'BULK-NF', supplierRef: '33333333-3333-4333-8333-333333333333' }),
    );
    const ghost = '00000000-0000-4000-8000-000000009999';
    const res = await bulk({
      items: [
        { id: ghost, version: 0 },
        { id: ok1, version: 0 },
      ],
      dueDate: '2027-04-04',
    });
    assert.equal(res.statusCode, 200, res.body);
    const byId = new Map(
      (res.json() as { results: { documentId: string; outcome: string }[] }).results.map((r) => [
        r.documentId,
        r.outcome,
      ]),
    );
    assert.equal(byId.get(ghost), 'not-found');
    assert.equal(byId.get(ok1), 'ok');
  });

  it('CA4: payload inválido → 400 (nada aplicado)', async () => {
    assert.equal((await bulk({ items: [], dueDate: '2027-01-01' })).statusCode, 400, 'items vazio');
    assert.equal(
      (await bulk({ items: [{ id: '00000000-0000-4000-8000-000000000001', version: 0 }] }))
        .statusCode,
      400,
      'sem dueDate',
    );
    assert.equal(
      (
        await bulk({
          items: [{ id: '00000000-0000-4000-8000-000000000001', version: 'x' }],
          dueDate: '2027-01-01',
        })
      ).statusCode,
      400,
      'version não-int',
    );
    assert.equal(
      (await bulk({ items: [{ id: 'nope', version: 0 }], dueDate: '2027-01-01' })).statusCode,
      400,
      'id malformado',
    );
  });

  it('CA-AUTH: sem fiscal-document:write → 403', async () => {
    const res = await bulk(
      {
        items: [{ id: '00000000-0000-4000-8000-000000000001', version: 0 }],
        dueDate: '2027-01-01',
      },
      PLAIN,
    );
    assert.equal(res.statusCode, 403);
  });
});
