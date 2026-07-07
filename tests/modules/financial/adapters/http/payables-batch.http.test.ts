/**
 * BATCH-FINANCIAL-PAYABLES (#357) — borda HTTP: POST /api/v2/financial/payables:batch.
 *
 * Resolve payableId[] → resumo do título (match card da Conciliação #172, sem N+1). Read-only.
 * Driver memory (sem Docker); auth via hooks FAKE (o "token" Bearer carrega as permissões por vírgula).
 * Fastify.inject por cenário (ADR-0037, princípio VII). W0 RED: a rota ainda não existe → 404.
 *
 * supplierName/supplierDocument = null no driver memory (fin_supplier_view vazio sem worker); a
 * resolução real é coberta em test:integration / Bruno E2E.
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

const READER = 'fiscal-document:read';
const WRITER = 'fiscal-document:write,fiscal-document:read';
const PLAIN = 'none'; // token válido, sem permissões financial → 403 (não 401)
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const BATCH_URL = '/api/v2/financial/payables:batch';
const MISSING_UUID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const SUPPLIER_REF = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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

const bearer = (perms: string) => ({ authorization: `Bearer ${perms}` });

const nfseBody = (overrides: Record<string, unknown> = {}) => ({
  type: 'NFS-e',
  documentNumber: 'NFS-BATCH-001',
  supplierRef: SUPPLIER_REF,
  paymentMethod: 'PIX',
  grossValueCents: '100000',
  sourceDiscountsCents: '0',
  discountsCents: '0',
  penaltyCents: '0',
  interestCents: '0',
  retentions: [],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
  ...overrides,
});

/** Cria 1 documento Open (→ 1 payable Parent) e devolve { payableId, documentId }. */
const seedPayable = async (): Promise<{ payableId: string; documentId: string }> => {
  const createRes = await handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: bearer(WRITER),
    payload: nfseBody(),
  });
  assert.equal(createRes.statusCode, 201, createRes.body);
  const documentId = (createRes.json() as { id: string }).id;

  const listRes = await handle.app.inject({
    method: 'GET',
    url: '/api/v2/financial/payable-titles',
    headers: bearer(READER),
  });
  assert.equal(listRes.statusCode, 200, listRes.body);
  const items = (listRes.json() as { items: { payableId: string; documentId: string }[] }).items;
  const seeded = items.find((p) => p.documentId === documentId);
  assert.ok(seeded, 'payable semeado deve aparecer no payable-titles');
  return { payableId: seeded.payableId, documentId };
};

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

describe('financial/http — POST /payables:batch (#357)', () => {
  // ── RBAC ──────────────────────────────────────────────────────────────────
  it('CA1: sem Authorization → 401', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: BATCH_URL,
      payload: { refs: [MISSING_UUID] },
    });
    assert.equal(res.statusCode, 401, res.body);
  });

  it('CA2: token sem fiscal-document:read → 403', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: BATCH_URL,
      headers: bearer(PLAIN),
      payload: { refs: [MISSING_UUID] },
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  // ── Validação de borda (Zod) ───────────────────────────────────────────────
  it('CA3: refs com UUID mal-formado → 400', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: BATCH_URL,
      headers: bearer(READER),
      payload: { refs: ['not-a-uuid'] },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it('CA4: refs vazio → 400 (min 1)', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: BATCH_URL,
      headers: bearer(READER),
      payload: { refs: [] },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  it('CA5: refs > 200 → 400 (max 200)', async () => {
    const refs = Array.from(
      { length: 201 },
      (_v, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
    );
    const res = await handle.app.inject({
      method: 'POST',
      url: BATCH_URL,
      headers: bearer(READER),
      payload: { refs },
    });
    assert.equal(res.statusCode, 400, res.body);
  });

  // ── Feliz + missing ─────────────────────────────────────────────────────────
  it('CA6: refs=[existente, inexistente] → 200 com items + missing', async () => {
    const { payableId, documentId } = await seedPayable();
    const res = await handle.app.inject({
      method: 'POST',
      url: BATCH_URL,
      headers: bearer(READER),
      payload: { refs: [payableId, MISSING_UUID] },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      items: {
        ref: string;
        documentId: string;
        documentNumber: string | null;
        documentType: string | null;
        valueCents: string;
        dueDate: string;
        status: string;
        paymentMethod: string | null;
        supplierRef: string | null;
        supplierName: string | null;
        supplierDocument: string | null;
      }[];
      missing: string[];
    };

    assert.equal(body.items.length, 1, 'exatamente o payable existente');
    const item = body.items[0]!;
    assert.equal(item.ref, payableId);
    assert.equal(item.documentId, documentId);
    assert.equal(item.documentNumber, 'NFS-BATCH-001');
    assert.equal(item.documentType, 'NFS-e');
    assert.match(item.valueCents, /^\d+$/, 'cents-string');
    assert.equal(item.dueDate, '2026-12-31');
    assert.equal(item.status, 'Open');
    assert.equal(item.paymentMethod, 'PIX');
    assert.equal(item.supplierRef, SUPPLIER_REF);
    // Driver memory: read-model de fornecedor vazio → null (resolução real em integração).
    assert.equal(item.supplierName, null);
    assert.equal(item.supplierDocument, null);

    assert.deepEqual(body.missing, [MISSING_UUID]);
  });

  // ── Roteamento do custom method não vaza para paths irmãos ──────────────────
  it('CA7: POST /payablesXYZ (fora do custom method :batch) → 404', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/payablesXYZ',
      headers: bearer(READER),
      payload: { refs: [MISSING_UUID] },
    });
    assert.equal(res.statusCode, 404, res.body);
  });
});
