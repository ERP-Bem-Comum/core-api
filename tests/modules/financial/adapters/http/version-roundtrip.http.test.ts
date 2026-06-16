/**
 * FIN-LISTAGEM-TIMELINE — contrato de consumo da versão (optimistic lock) na borda HTTP.
 *
 * PROVA que o campo `version` viaja nas respostas e é rejeitado quando stale:
 *   1. POST cria → resposta inclui `version: 0`.
 *   2. GET /:id → `version` coerente (0).
 *   3. PATCH com versão lida da resposta anterior (0) → 200, resposta `version: 1`.
 *   4. PATCH com versão ANTIGA (0 stale) → 409 `document-version-conflict`.
 *   5. approve com versão atual (1) → 200, resposta `version: 2`.
 *   6. GET /documents (lista) → cada item inclui `version`.
 *
 * Vernon, _Implementing DDD_ (ddd--vernon-livro-vermelho.md:8869): "objects carry a version
 * number that is incremented when changes are made and checked before they are saved".
 *
 * Auth via hooks FAKE (mesmo padrão das demais suites HTTP deste módulo).
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

// ─── Perfis ──────────────────────────────────────────────────────────────────

const WRITER = 'fiscal-document:write,fiscal-document:read,fiscal-document:cancel';
const APPROVER = `${WRITER},payable:approve`;

// ─── Hooks FAKE ──────────────────────────────────────────────────────────────

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

// ─── Factory App ──────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const nfseBody = (): Record<string, unknown> => ({
  type: 'NFS-e',
  documentNumber: 'VER-001',
  supplierRef: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  paymentMethod: 'PIX',
  grossValueCents: '100000',
  retentions: [],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
});

const bearerWriter = { authorization: `Bearer ${WRITER}` };
const bearerApprover = { authorization: `Bearer ${APPROVER}` };

// ─── Testes ───────────────────────────────────────────────────────────────────

describe('FIN-LISTAGEM-TIMELINE — version round-trip (optimistic lock na borda HTTP)', () => {
  it('CVR-001: POST cria → resposta inclui version: 0', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: bearerWriter,
      payload: nfseBody(),
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as { id: string; version: number };
    assert.ok(typeof body.id === 'string', 'id deve ser string');
    assert.equal(
      body.version,
      0,
      `version deve ser 0 na criação, recebeu: ${String(body.version)}`,
    );
  });

  it('CVR-002: GET /:id após criação → version: 0 coerente', async () => {
    // Cria o documento
    const createRes = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: bearerWriter,
      payload: nfseBody(),
    });
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    // Lê via GET /:id
    const getRes = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/documents/${docId}`,
      headers: bearerWriter,
    });
    assert.equal(getRes.statusCode, 200, getRes.body);
    const body = getRes.json() as { id: string; version: number };
    assert.equal(body.id, docId);
    assert.equal(
      body.version,
      0,
      `GET /:id deve retornar version: 0, recebeu: ${String(body.version)}`,
    );
  });

  it('CVR-003: PATCH com version lida da criação (0) → 200, resposta version: 1', async () => {
    // Cria → v0
    const createRes = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: bearerWriter,
      payload: nfseBody(),
    });
    assert.equal(createRes.statusCode, 201, createRes.body);
    const created = createRes.json() as { id: string; version: number };
    assert.equal(created.version, 0);

    // PATCH usando a version da resposta anterior → deve incrementar para 1
    const patchRes = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/documents/${created.id}`,
      headers: bearerWriter,
      payload: { version: created.version, grossValueCents: '150000' },
    });
    assert.equal(patchRes.statusCode, 200, patchRes.body);
    const patched = patchRes.json() as { version: number };
    assert.equal(
      patched.version,
      1,
      `PATCH bem-sucedido deve retornar version: 1, recebeu: ${String(patched.version)}`,
    );
  });

  it('CVR-004: PATCH com version stale (0 enquanto atual é 1) → 409 document-version-conflict', async () => {
    // Cria → v0
    const createRes = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: bearerWriter,
      payload: nfseBody(),
    });
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    // Primeiro PATCH: v0 → v1 (bem-sucedido)
    const first = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/documents/${docId}`,
      headers: bearerWriter,
      payload: { version: 0, grossValueCents: '150000' },
    });
    assert.equal(first.statusCode, 200, first.body);

    // Segundo PATCH com versão stale (0) → deve ser 409
    const stale = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/documents/${docId}`,
      headers: bearerWriter,
      payload: { version: 0, grossValueCents: '200000' },
    });
    assert.equal(
      stale.statusCode,
      409,
      `PATCH com versão stale deve retornar 409, recebeu: ${stale.statusCode} ${stale.body}`,
    );
  });

  it('CVR-005: approve com version atual (1) → 200, resposta version: 2', async () => {
    // Cria → v0
    const createRes = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: bearerApprover,
      payload: nfseBody(),
    });
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    // PATCH: v0 → v1
    const patchRes = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/documents/${docId}`,
      headers: bearerApprover,
      payload: { version: 0, grossValueCents: '150000' },
    });
    assert.equal(patchRes.statusCode, 200, patchRes.body);
    const afterPatch = patchRes.json() as { version: number };
    assert.equal(afterPatch.version, 1);

    // approve com version: 1 → v2
    const approveRes = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${docId}/approve`,
      headers: bearerApprover,
      payload: { version: afterPatch.version },
    });
    assert.equal(approveRes.statusCode, 200, approveRes.body);
    const approved = approveRes.json() as { status: string; version: number };
    assert.equal(approved.status, 'Approved');
    assert.equal(
      approved.version,
      2,
      `approve deve retornar version: 2, recebeu: ${String(approved.version)}`,
    );
  });

  it('CVR-007: create→PATCH→approve→undo-approval (correto) → 200 com version: 3', async () => {
    // Cria → v0
    const createRes = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: bearerApprover,
      payload: nfseBody(),
    });
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    // PATCH com v0 → v1
    const patchRes = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/documents/${docId}`,
      headers: bearerApprover,
      payload: { version: 0, grossValueCents: '150000' },
    });
    assert.equal(patchRes.statusCode, 200, patchRes.body);
    assert.equal((patchRes.json() as { version: number }).version, 1);

    // approve com v1 → v2
    const approveRes = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${docId}/approve`,
      headers: bearerApprover,
      payload: { version: 1 },
    });
    assert.equal(approveRes.statusCode, 200, approveRes.body);
    assert.equal((approveRes.json() as { version: number }).version, 2);

    // undo-approval com v2 (correto) → v3
    const undoRes = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${docId}/undo-approval`,
      headers: bearerApprover,
      payload: { version: 2 },
    });
    assert.equal(undoRes.statusCode, 200, undoRes.body);
    const undone = undoRes.json() as { version: number };
    assert.equal(
      undone.version,
      3,
      `undo-approval deve retornar version: 3, recebeu: ${String(undone.version)}`,
    );
  });

  it('CVR-008: undo-approval com version stale após ciclo completo → 409 document-version-conflict', async () => {
    // Cria → v0
    const createRes = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: bearerApprover,
      payload: nfseBody(),
    });
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    // PATCH com v0 → v1
    const patchRes = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/documents/${docId}`,
      headers: bearerApprover,
      payload: { version: 0, grossValueCents: '150000' },
    });
    assert.equal(patchRes.statusCode, 200, patchRes.body);

    // approve com v1 → v2
    const approveRes = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${docId}/approve`,
      headers: bearerApprover,
      payload: { version: 1 },
    });
    assert.equal(approveRes.statusCode, 200, approveRes.body);

    // undo-approval com v2 → v3
    const undoRes = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${docId}/undo-approval`,
      headers: bearerApprover,
      payload: { version: 2 },
    });
    assert.equal(undoRes.statusCode, 200, undoRes.body);
    assert.equal((undoRes.json() as { version: number }).version, 3);

    // approve com v2 (stale — atual é v3) → 409
    const staleApprove = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${docId}/approve`,
      headers: bearerApprover,
      payload: { version: 2 },
    });
    assert.equal(
      staleApprove.statusCode,
      409,
      `approve com versão stale deve retornar 409, recebeu: ${staleApprove.statusCode} ${staleApprove.body}`,
    );
    // #52 (OWASP API8): o body 4xx expõe o `code` público `conflict`, não o slug interno
    // `document-version-conflict` (que fica só no log). O 409 prova o optimistic lock.
    const errBody = staleApprove.json() as { error: { code: string } };
    assert.equal(
      errBody.error.code,
      'conflict',
      `código público do erro deve ser conflict, recebeu: ${errBody.error.code}`,
    );
  });

  it('CVR-006: GET /documents (lista) → cada item inclui version como número', async () => {
    // Garante ao menos um documento no store
    const createRes = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: bearerWriter,
      payload: nfseBody(),
    });
    assert.equal(createRes.statusCode, 201, createRes.body);

    const listRes = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/documents?status=Open&page=1&pageSize=50',
      headers: bearerWriter,
    });
    assert.equal(listRes.statusCode, 200, listRes.body);
    const list = listRes.json() as { items: { version: number }[]; total: number };
    assert.ok(list.items.length >= 1, 'deve haver ao menos 1 item na lista');
    for (const item of list.items) {
      assert.equal(
        typeof item.version,
        'number',
        `item da listagem deve ter version: number, recebeu: ${String(item.version)}`,
      );
    }
  });
});
