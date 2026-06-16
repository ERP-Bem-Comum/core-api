/**
 * FIN-LISTAGEM-TIMELINE — W0 RED do optimistic lock (FR-009/ADR-0002).
 *
 * Hoje a borda RECEBE `version` mas o DESCARTA (use cases/repo não comparam) → operações com versão
 * desatualizada passam silenciosamente (last-write-wins). Estes cenários esperam `409
 * document-version-conflict` quando a versão informada está stale → FALHAM hoje (RED).
 *
 * Sequência de versão é lógica: criação → v0; cada mutação bem-sucedida → +1.
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
const undo = (id: string, version: number) =>
  handle.app.inject({
    method: 'POST',
    url: `/api/v2/financial/documents/${id}/undo-approval`,
    headers: { authorization: `Bearer ${APPROVER}` },
    payload: { version },
  });

describe('FIN-LISTAGEM-TIMELINE — optimistic lock (FR-009)', () => {
  it('CT-018: ajustar com versão desatualizada → 409', async () => {
    const id = await create(); // v0
    const first = await patch(id, 0); // v0 → v1
    assert.equal(first.statusCode, 200, first.body);
    const stale = await patch(id, 0); // v0 stale (atual é v1) → conflito
    assert.equal(stale.statusCode, 409, stale.body);
  });

  it('CT-019: aprovar com a versão correta → 200', async () => {
    const id = await create(); // v0
    const adjusted = await patch(id, 0); // v0 → v1 (continua Open)
    assert.equal(adjusted.statusCode, 200, adjusted.body);
    const ok = await approve(id, 1); // versão correta
    assert.equal(ok.statusCode, 200, ok.body);
  });

  it('CT-020: desfazer aprovação com versão desatualizada → 409', async () => {
    const id = await create(); // v0
    await patch(id, 0); // v1
    const approved = await approve(id, 1); // v2 (Approved)
    assert.equal(approved.statusCode, 200, approved.body);
    const stale = await undo(id, 0); // v0 stale → conflito
    assert.equal(stale.statusCode, 409, stale.body);
  });

  it('CT-021: aprovar com versão desatualizada (doc ainda Open) → 409', async () => {
    const id = await create(); // v0
    await patch(id, 0); // v1 (Open)
    const stale = await approve(id, 0); // v0 stale → conflito (não state-transition)
    assert.equal(stale.statusCode, 409, stale.body);
  });
});
