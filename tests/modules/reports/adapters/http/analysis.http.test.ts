/**
 * W0 RED — REPORTS-ANALYSIS-PAYABLES (REP-3 · #114). Borda GET /api/v2/reports/analysis/payables
 * + /reports/analysis/chart. RED por inexistência das rotas/deps no módulo `reports`.
 *
 * CA1: analysis/payables → AnalysisReport (totalValueOfPeriod + data[] por categoria, itens[] mensais,
 *      costCenters[]).
 * CA2: RBAC — sem `fiscal-document:read` → 403; query sem dueStart/dueEnd → 400.
 * CA3: analysis/chart → [{ id, name, total }] por categoria.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { ok } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { buildReportsHttpDeps, reportsHttpPlugin } from '#src/modules/reports/public-api/http.ts';
import type { AnalysisRow } from '#src/modules/reports/application/ports/analysis-read.ts';

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

const CAT_A = '11111111-1111-4111-8111-111111111111';
const CAT_B = '22222222-2222-4222-8222-222222222222';
const CC_1 = '33333333-3333-4333-8333-333333333333';

// Seed de rows planas (grão categoria × cc × mês) que o DTO aninha.
const ROWS: AnalysisRow[] = [
  {
    categoryRef: CAT_A,
    categoryName: 'Aluguel',
    costCenterRef: CC_1,
    costCenterName: 'Administrativo',
    monthYear: '2026-07',
    totalCents: 100000,
  },
  {
    categoryRef: CAT_A,
    categoryName: 'Aluguel',
    costCenterRef: CC_1,
    costCenterName: 'Administrativo',
    monthYear: '2026-08',
    totalCents: 50000,
  },
  {
    categoryRef: CAT_B,
    categoryName: 'Energia',
    costCenterRef: null,
    costCenterName: null,
    monthYear: '2026-07',
    totalCents: 30000,
  },
];

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const base = await buildReportsHttpDeps({ driver: 'memory' });
  const deps = { ...base, listAnalysis: () => Promise.resolve(ok(ROWS)) };
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

const get = (url: string, perm: string): Promise<LightMyRequestResponse> =>
  handle.app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${perm}` } });

const PAYABLES = '/api/v2/reports/analysis/payables?dueStart=2026-07-01&dueEnd=2026-09-01';
const CHART = '/api/v2/reports/analysis/chart?dueStart=2026-07-01&dueEnd=2026-09-01';

interface AnalysisReport {
  totalValueOfPeriod: number;
  data: {
    id: string | null;
    name: string | null;
    total: number;
    itens: { monthYear: string; total: number }[];
    costCenters: { id: string | null; name: string | null; total: number }[];
  }[];
}

describe('reports/http — analysis (REP-3 · #114)', () => {
  it('CA1: analysis/payables → AnalysisReport aninhado por categoria', async () => {
    const res = await get(PAYABLES, READER);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as AnalysisReport;
    assert.equal(body.totalValueOfPeriod, 180000, '100000+50000+30000');
    assert.equal(body.data.length, 2, 'categoria A + B');
    const a = body.data.find((d) => d.id === CAT_A)!;
    assert.equal(a.name, 'Aluguel');
    assert.equal(a.total, 150000);
    // quebra mensal
    const byMonth = (x: readonly (string | number)[], y: readonly (string | number)[]) =>
      String(x[0]).localeCompare(String(y[0]));
    assert.deepEqual(
      a.itens.map((i) => [i.monthYear, i.total]).sort(byMonth),
      [
        ['2026-07', 100000],
        ['2026-08', 50000],
      ].sort(byMonth),
    );
    // sub-quebra por centro de custo
    assert.equal(a.costCenters.length, 1);
    assert.equal(a.costCenters[0]!.id, CC_1);
    assert.equal(a.costCenters[0]!.total, 150000);
    // categoria B com CC nulo
    const b = body.data.find((d) => d.id === CAT_B)!;
    assert.equal(b.costCenters[0]!.id, null);
  });

  it('CA2: RBAC 403 sem permissão + 400 sem dueStart/dueEnd', async () => {
    assert.equal((await get(PAYABLES, NO_PERM)).statusCode, 403);
    const bad = await get('/api/v2/reports/analysis/payables', READER);
    assert.equal(bad.statusCode, 400, bad.body);
  });

  it('CA3: analysis/chart → [{id,name,total}] por categoria', async () => {
    const res = await get(CHART, READER);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { id: string | null; name: string | null; total: number }[];
    assert.equal(body.length, 2);
    const a = body.find((c) => c.id === CAT_A)!;
    assert.equal(a.name, 'Aluguel');
    assert.equal(a.total, 150000);
    assert.deepEqual([...Object.keys(a)].sort(), ['id', 'name', 'total'].sort());
  });
});
