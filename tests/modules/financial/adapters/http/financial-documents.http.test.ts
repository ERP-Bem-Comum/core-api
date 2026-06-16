/**
 * FIN-DOCUMENTO-TITULOS — testes HTTP da borda /api/v2/financial/documents.
 *
 * Driver: memory (sem Docker). Auth via hooks FAKE (requireAuth/authorize injetados) — sem
 * `auth` real nem login HTTP (evita rate-limit/lockout do /auth/login). O "token" Bearer
 * carrega a lista de permissões do perfil (separadas por vírgula); o authorize fake concede
 * se a permissão exigida estiver na lista. Fastify.inject por cenário (ADR-0037, princípio VII).
 *
 * Cobre CA1..CA15 (criação Open/Draft, ajuste, aprovação, separação de funções, undo, cancel,
 * leituras, validações). RBAC testado via os hooks fake — a integração com o `auth` real é
 * validada em `test:integration` / E2E Bruno.
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

// ─── Perfis como conjuntos de permissões (o "token" Bearer carrega as perms) ──────────
const WRITER = 'fiscal-document:write,fiscal-document:read,fiscal-document:cancel';
const APPROVER = `${WRITER},payable:approve`;
const PLAIN = 'none'; // tem token, mas sem permissões financial → 403 (não 401)

// ─── Hooks de auth FAKE ───────────────────────────────────────────────────────────────
// UserRef válido (UUID v4) do "usuário autenticado" — o handler de approve usa req.userId como approvedBy.
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

// ─── Helper: body mínimo para NFS-e com ISS ──────────────────────────────────
const nfseBody = (overrides: Record<string, unknown> = {}) => ({
  type: 'NFS-e',
  documentNumber: 'NFS-001',
  supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  paymentMethod: 'PIX',
  grossValueCents: '100000', // R$ 1.000,00
  sourceDiscountsCents: '0',
  discountsCents: '0',
  penaltyCents: '0',
  interestCents: '0',
  retentions: [{ type: 'ISS', baseCents: '100000', rateBps: 300, valueCents: '3000' }],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
  ...overrides,
});

// ─── Factory do app ───────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
const bearer = (perms: string) => ({ authorization: `Bearer ${perms}` });

const postDocument = (perms: string, body: Record<string, unknown>) =>
  handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: bearer(perms),
    payload: body,
  });

// ─── Testes ───────────────────────────────────────────────────────────────────
describe('FIN-DOCUMENTO-TITULOS — /api/v2/financial/documents', () => {
  // ── Auth / RBAC ──────────────────────────────────────────────────────────
  it('CA12: POST sem Authorization → 401', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      payload: nfseBody(),
    });
    assert.equal(res.statusCode, 401);
  });

  it('CA13: POST com token sem fiscal-document:write → 403', async () => {
    const res = await postDocument(PLAIN, nfseBody());
    assert.equal(res.statusCode, 403);
  });

  // ── Criação (Open) ────────────────────────────────────────────────────────
  it('CA1: POST NFS-e com retenção ISS → 201 + status Open + pai e filho', async () => {
    const res = await postDocument(WRITER, nfseBody());
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as {
      id: string;
      status: string;
      netValueCents: string;
      payables: { kind: string; retentionType: string | null; status: string }[];
    };
    assert.equal(body.status, 'Open');
    assert.equal(body.netValueCents, '97000'); // 100000 − 3000
    assert.equal(body.payables.length, 2);
    const parent = body.payables.find((p) => p.kind === 'Parent');
    const child = body.payables.find((p) => p.kind === 'Child');
    assert.ok(parent, 'deve ter título pai');
    assert.ok(child, 'deve ter título filho ISS');
    assert.equal(child.retentionType, 'ISS');
    assert.equal(parent.status, 'Open');
    assert.equal(child.status, 'Open');
  });

  // ── Criação (Draft) ───────────────────────────────────────────────────────
  it('CA2: POST com asDraft:true → 201 + status Draft', async () => {
    const res = await postDocument(WRITER, nfseBody({ asDraft: true, dueDate: undefined }));
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as { status: string; payables: unknown[] };
    assert.equal(body.status, 'Draft');
    assert.equal(body.payables.length, 0);
  });

  // ── Ajuste (PATCH) ────────────────────────────────────────────────────────
  it('CA3: PATCH /documents/:id ajusta Open → 200 com novo netValueCents', async () => {
    const createRes = await postDocument(WRITER, nfseBody({ retentions: [] }));
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const patchRes = await handle.app.inject({
      method: 'PATCH',
      url: `/api/v2/financial/documents/${docId}`,
      headers: bearer(WRITER),
      payload: { version: 0, grossValueCents: '200000' },
    });
    assert.equal(patchRes.statusCode, 200, patchRes.body);
    const updated = patchRes.json() as { netValueCents: string; status: string };
    assert.equal(updated.status, 'Open');
    assert.equal(updated.netValueCents, '200000');
  });

  // ── Aprovação ─────────────────────────────────────────────────────────────
  it('CA4: POST /approve Aprovador → 200 + status Approved + payables Approved', async () => {
    const createRes = await postDocument(APPROVER, nfseBody({ retentions: [] }));
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const approveRes = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${docId}/approve`,
      headers: bearer(APPROVER),
      payload: { version: 0 },
    });
    assert.equal(approveRes.statusCode, 200, approveRes.body);
    const approved = approveRes.json() as { status: string; payables: { status: string }[] };
    assert.equal(approved.status, 'Approved');
    assert.ok(
      approved.payables.every((p) => p.status === 'Approved'),
      'payables devem ser Approved',
    );
  });

  // ── Separação de funções ─────────────────────────────────────────────────
  it('CA5: Operador (sem payable:approve) → 403 no /approve', async () => {
    const createRes = await postDocument(WRITER, nfseBody({ retentions: [] }));
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const approveRes = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${docId}/approve`,
      headers: bearer(WRITER),
      payload: { version: 0 },
    });
    assert.equal(approveRes.statusCode, 403);
  });

  // ── Desfazer aprovação ────────────────────────────────────────────────────
  it('CA6: POST /undo-approval → 200 + status Open', async () => {
    const createRes = await postDocument(APPROVER, nfseBody({ retentions: [] }));
    assert.equal(createRes.statusCode, 201);
    const docId = (createRes.json() as { id: string }).id;

    await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${docId}/approve`,
      headers: bearer(APPROVER),
      payload: { version: 0 },
    });

    const undoRes = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${docId}/undo-approval`,
      // version: 1 — o approve anterior (v0 → v1) incrementou a versão; o undo
      // deve usar a versão coerente, agora que o optimistic lock é enforçado (FR-009).
      headers: bearer(APPROVER),
      payload: { version: 1 },
    });
    assert.equal(undoRes.statusCode, 200, undoRes.body);
    assert.equal((undoRes.json() as { status: string }).status, 'Open');
  });

  // ── Cancelamento ──────────────────────────────────────────────────────────
  it('CA7: DELETE /documents/:id sobre Open → 204', async () => {
    const createRes = await postDocument(WRITER, nfseBody({ retentions: [] }));
    assert.equal(createRes.statusCode, 201);
    const docId = (createRes.json() as { id: string }).id;

    const deleteRes = await handle.app.inject({
      method: 'DELETE',
      url: `/api/v2/financial/documents/${docId}`,
      headers: bearer(WRITER),
      payload: { version: 0 }, // #55: optimistic lock — doc recém-criado é v0
    });
    assert.equal(deleteRes.statusCode, 204);
  });

  it('CA8: DELETE sobre Approved → 409 (invalid-state-transition)', async () => {
    const createRes = await postDocument(APPROVER, nfseBody({ retentions: [] }));
    assert.equal(createRes.statusCode, 201);
    const docId = (createRes.json() as { id: string }).id;

    await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${docId}/approve`,
      headers: bearer(APPROVER),
      payload: { version: 0 },
    });

    const deleteRes = await handle.app.inject({
      method: 'DELETE',
      url: `/api/v2/financial/documents/${docId}`,
      headers: bearer(APPROVER),
      payload: { version: 1 }, // #55: version corrente após approve; rejeição vem do estado (Approved)
    });
    assert.equal(deleteRes.statusCode, 409);
  });

  // ── Leituras ──────────────────────────────────────────────────────────────
  it('CA9: GET /documents/:id → 200 detalhe completo', async () => {
    const createRes = await postDocument(WRITER, nfseBody({ retentions: [] }));
    assert.equal(createRes.statusCode, 201);
    const docId = (createRes.json() as { id: string }).id;

    const getRes = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/documents/${docId}`,
      headers: bearer(WRITER),
    });
    assert.equal(getRes.statusCode, 200, getRes.body);
    const detail = getRes.json() as { id: string; status: string };
    assert.equal(detail.id, docId);
    assert.equal(detail.status, 'Open');
  });

  it('CA10: GET /documents → 200 + shape de lista paginada', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/documents',
      headers: bearer(WRITER),
    });
    assert.equal(res.statusCode, 200, res.body);
    const list = res.json() as { items: unknown[]; page: number; pageSize: number; total: number };
    assert.ok(Array.isArray(list.items));
    assert.equal(typeof list.page, 'number');
    assert.equal(typeof list.total, 'number');
  });

  it('CA11: GET /documents/:id inexistente → 404', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/documents/ffffffff-ffff-4fff-8fff-ffffffffffff',
      headers: bearer(WRITER),
    });
    assert.equal(res.statusCode, 404);
  });

  // ── Validações de negócio ─────────────────────────────────────────────────
  it('CA14: POST sem dueDate (não-draft) → 422', async () => {
    const res = await postDocument(WRITER, nfseBody({ dueDate: undefined, asDraft: false }));
    assert.equal(res.statusCode, 422);
  });

  it('CA15: POST DANFE com retenção ISS → 422 (retention-not-allowed-for-type)', async () => {
    const res = await postDocument(
      WRITER,
      nfseBody({
        type: 'DANFE',
        retentions: [{ type: 'ISS', baseCents: '100000', rateBps: 300, valueCents: '3000' }],
      }),
    );
    assert.equal(res.statusCode, 422);
  });

  // ── Segurança: guard de overflow numérico na borda (security review F1) ────
  it('CA16: POST com grossValueCents de string longa → 400 (não chega ao domínio)', async () => {
    const res = await postDocument(WRITER, nfseBody({ grossValueCents: '9'.repeat(30) }));
    // Zod rejeita na borda (max 16 dígitos + safe-integer) → 400, sem corromper o cálculo de Money.
    assert.equal(res.statusCode, 400, res.body);
  });
});
