/**
 * W0 RED — REPORTS-PAYMENT-POSITION (REP-4 · #243). Borda GET /api/v2/reports/payment-position —
 * agrega payables por Fornecedor × Centro de Custo × Categoria em 3 baldes. RED por inexistência
 * da rota/deps no módulo `reports`.
 *
 * CA1: 200 com linhas por (fornecedor, CC, categoria) + baldes pending/paid/overdue.
 * CA2: RBAC — sem `fiscal-document:read` → 403.
 * CA3: contrato de saída fechado (9 colunas por linha).
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { ok } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { buildReportsHttpDeps, reportsHttpPlugin } from '#src/modules/reports/public-api/http.ts';
import type { PaymentPositionRow } from '#src/modules/reports/application/ports/payment-position-read.ts';

const READER = 'fiscal-document:read';
const NO_PERM = 'reconciliation:read';
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

const row = (over: Partial<PaymentPositionRow> = {}): PaymentPositionRow => ({
  supplierRef: '11111111-1111-4111-8111-111111111111',
  supplierName: 'Fornecedor Alpha',
  costCenterRef: '33333333-3333-4333-8333-333333333333',
  costCenterName: 'Administrativo',
  categoryRef: '22222222-2222-4222-8222-222222222222',
  categoryName: 'Aluguel',
  pendingCents: 300000,
  paidCents: 150000,
  overdueCents: 100000,
  ...over,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const base = await buildReportsHttpDeps({ driver: 'memory' });
  const deps = {
    ...base,
    listPaymentPosition: () =>
      Promise.resolve(
        ok([
          row(),
          row({
            supplierRef: null,
            supplierName: null,
            costCenterRef: null,
            costCenterName: null,
            categoryRef: null,
            categoryName: null,
            pendingCents: 5000,
            paidCents: 0,
            overdueCents: 5000,
          }),
        ]),
      ),
  };
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [reportsHttpPlugin(deps, { requireAuth, authorize })],
  });
  handle = { app, teardown: () => app.close() };
});

after(async () => {
  await handle.teardown();
});

const get = (perm: string): Promise<LightMyRequestResponse> =>
  handle.app.inject({
    method: 'GET',
    url: '/api/v2/reports/payment-position',
    headers: { authorization: `Bearer ${perm}` },
  });

describe('reports/http — GET /reports/payment-position (REP-4 · #243)', () => {
  it('CA1: 200 com linhas por (fornecedor, CC, categoria) + 3 baldes', async () => {
    const res = await get(READER);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { positions: PaymentPositionRow[] };
    assert.equal(body.positions.length, 2);
    const first = body.positions[0]!;
    assert.equal(first.supplierName, 'Fornecedor Alpha');
    assert.equal(first.categoryName, 'Aluguel');
    assert.equal(first.pendingCents, 300000);
    assert.equal(first.paidCents, 150000);
    assert.equal(first.overdueCents, 100000);
    // grupo sem CC/categoria → refs/nomes null
    assert.equal(body.positions[1]!.costCenterRef, null);
    assert.equal(body.positions[1]!.categoryName, null);
  });

  it('CA2: RBAC — sem fiscal-document:read → 403', async () => {
    const res = await get(NO_PERM);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('CA3: contrato de saída fechado (9 colunas por linha)', async () => {
    const res = await get(READER);
    const body = res.json() as { positions: Record<string, unknown>[] };
    assert.deepEqual(
      [...Object.keys(body.positions[0]!)].sort(),
      [
        'categoryName',
        'categoryRef',
        'costCenterName',
        'costCenterRef',
        'overdueCents',
        'paidCents',
        'pendingCents',
        'supplierName',
        'supplierRef',
      ].sort(),
    );
  });
});
