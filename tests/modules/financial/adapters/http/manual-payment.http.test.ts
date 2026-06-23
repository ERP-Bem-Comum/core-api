/**
 * #224 — borda HTTP da baixa manual de título (POST /documents/:id/payables/:payableId/manual-payment).
 * Aprovado → Pago por título. RBAC payable:approve. Driver memory; auth FAKE. W0 RED: rota inexistente.
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

const TOKEN = 'fiscal-document:write,payable:approve';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const SUP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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

const openNfseBody = () => ({
  type: 'NFS-e',
  documentNumber: 'NFS-PAY-1',
  supplierRef: SUP,
  paymentMethod: 'PIX',
  grossValueCents: '1000000',
  sourceDiscountsCents: '0',
  discountsCents: '0',
  penaltyCents: '0',
  interestCents: '0',
  retentions: [{ type: 'ISS', baseCents: '350000', rateBps: 1000, valueCents: '35000' }],
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

interface PayableDto {
  id: string;
  kind: string;
  status: string;
}

const approveNewDocument = async (): Promise<{ id: string; parentId: string; version: number }> => {
  const created = await handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: { authorization: `Bearer ${TOKEN}` },
    payload: openNfseBody(),
  });
  assert.equal(created.statusCode, 201, created.body);
  const id = (created.json() as { id: string }).id;

  const approved = await handle.app.inject({
    method: 'POST',
    url: `/api/v2/financial/documents/${id}/approve`,
    headers: { authorization: `Bearer ${TOKEN}` },
    payload: { version: 0 },
  });
  assert.equal(approved.statusCode, 200, approved.body);
  const body = approved.json() as { version: number; payables: readonly PayableDto[] };
  const parent = body.payables.find((p) => p.kind === 'Parent');
  assert.ok(parent !== undefined, 'esperava o título pai');
  return { id, parentId: parent.id, version: body.version };
};

describe('financial/http — baixa manual de título (#224)', () => {
  it('baixa o título pai (Aprovado→Pago) → 200 e o título fica Pago', async () => {
    const { id, parentId, version } = await approveNewDocument();

    const paid = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${id}/payables/${parentId}/manual-payment`,
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: { version, reason: 'pago no caixa' },
    });
    assert.equal(paid.statusCode, 200, paid.body);

    const detail = paid.json() as { payables: readonly PayableDto[] };
    const parent = detail.payables.find((p) => p.kind === 'Parent');
    assert.equal(parent?.status, 'Paid');
    assert.ok(
      detail.payables.filter((p) => p.kind === 'Child').every((c) => c.status === 'Approved'),
    );
  });

  it('exige payable:approve → 403 sem a permissão', async () => {
    const { id, parentId, version } = await approveNewDocument();
    const res = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/documents/${id}/payables/${parentId}/manual-payment`,
      headers: { authorization: 'Bearer fiscal-document:write' },
      payload: { version },
    });
    assert.equal(res.statusCode, 403, res.body);
  });
});
