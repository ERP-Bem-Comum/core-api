/**
 * W0 RED — REPORTS-SUPPLIERS-NO-CONTRACT (REP-2 · #240). Borda
 * GET /api/v2/reports/suppliers-without-contract — agrega payables `contract_ref IS NULL` por
 * fornecedor. RED por inexistência da rota/deps no módulo `reports`.
 *
 * CA1: 200 com lista agregada por fornecedor (supplierRef, name, totalCents, payableCount).
 * CA2: RBAC — sem `fiscal-document:read` → 403; com → 200.
 * CA3: contrato de saída fechado (só as 4 colunas por item).
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { ok } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { buildReportsHttpDeps, reportsHttpPlugin } from '#src/modules/reports/public-api/http.ts';
import type {
  SupplierWithoutContract,
  SuppliersWithoutContractFilter,
} from '#src/modules/reports/application/ports/suppliers-without-contract-read.ts';

// #694: plano orçamentário costurado pelo budget-plans (o reports só reflete o rótulo).
const PLAN_A = 'aa111111-1111-4111-8111-111111111111';
const LABEL_A = 'Cenário Base 2026';

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

const row = (over: Partial<SupplierWithoutContract> = {}): SupplierWithoutContract => ({
  supplierRef: '11111111-1111-4111-8111-111111111111',
  name: 'Fornecedor Alpha',
  totalCents: 150000,
  payableCount: 3,
  budgetPlanRef: PLAN_A,
  ...over,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;
// #694: captura o filtro montado pela borda, para provar o mapeamento query→filtro.
let lastFilter: SuppliersWithoutContractFilter | null = null;

before(async () => {
  const base = await buildReportsHttpDeps({ driver: 'memory' });
  const deps = {
    ...base,
    listSuppliersWithoutContract: (filter: SuppliersWithoutContractFilter) => {
      lastFilter = filter;
      return Promise.resolve(
        ok([
          row(), // fornecedor Alpha, plano A
          row({
            supplierRef: '22222222-2222-4222-8222-222222222222',
            name: null,
            totalCents: 5000,
            payableCount: 1,
            budgetPlanRef: null, // sem plano
          }),
        ]),
      );
    },
    resolvePlanLabels: () => Promise.resolve(ok(new Map([[PLAN_A, LABEL_A]]))),
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

const get = (perm: string, query = ''): Promise<LightMyRequestResponse> =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/reports/suppliers-without-contract${query}`,
    headers: { authorization: `Bearer ${perm}` },
  });

describe('reports/http — GET /reports/suppliers-without-contract (REP-2 · #240)', () => {
  it('CA1: 200 com quebra por fornecedor×plano; rótulo do plano costurado (#694)', async () => {
    const res = await get(READER);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      suppliers: (SupplierWithoutContract & { budgetPlanName: string | null })[];
    };
    assert.equal(body.suppliers.length, 2);
    const first = body.suppliers[0]!;
    assert.equal(first.supplierRef, '11111111-1111-4111-8111-111111111111');
    assert.equal(first.name, 'Fornecedor Alpha');
    assert.equal(first.totalCents, 150000);
    assert.equal(first.payableCount, 3);
    assert.equal(first.budgetPlanRef, PLAN_A);
    assert.equal(first.budgetPlanName, LABEL_A); // #694: costurado via resolvePlanLabels
    // supplier sem projeção em fin_supplier_view → name null (LEFT JOIN); sem plano → nomes null
    assert.equal(body.suppliers[1]!.name, null);
    assert.equal(body.suppliers[1]!.budgetPlanRef, null);
    assert.equal(body.suppliers[1]!.budgetPlanName, null);
  });

  it('CA2: RBAC — sem fiscal-document:read → 403', async () => {
    const res = await get(NO_PERM);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('CA3: contrato de saída fechado (6 colunas por item, #694)', async () => {
    const res = await get(READER);
    const body = res.json() as { suppliers: Record<string, unknown>[] };
    assert.deepEqual(
      [...Object.keys(body.suppliers[0]!)].sort(),
      [
        'budgetPlanName',
        'budgetPlanRef',
        'name',
        'payableCount',
        'supplierRef',
        'totalCents',
      ].sort(),
    );
  });

  it('#694: aceita os filtros de servidor (sem 400) e mapeia query→filtro', async () => {
    const PROGRAM = 'cc111111-1111-4111-8111-111111111111';
    const BUDGET = 'bb222222-2222-4222-8222-222222222222';
    const CATEGORY = 'ee333333-3333-4333-8333-333333333333';
    const res = await get(
      READER,
      `?programId=${PROGRAM}&budgetPlanId=${BUDGET}&categoryId=${CATEGORY}&dueFrom=2026-07-01&dueTo=2026-09-01`,
    );
    assert.equal(res.statusCode, 200, res.body); // antes do #694: rota sem querystring → params ignorados
    assert.equal(lastFilter?.programRef, PROGRAM);
    assert.equal(lastFilter?.budgetPlanRef, BUDGET);
    assert.equal(lastFilter?.categoryRef, CATEGORY);
    assert.equal(lastFilter?.dueFrom, '2026-07-01');
    assert.equal(lastFilter?.dueTo, '2026-09-01');
  });
});
