/**
 * REP-3 · #446 Slice C — reprojeção da "Análise de Pagamentos" para a árvore
 * Plano Orçamentário (raiz) → Centro de Custo (folha) × mês. Borda GET
 * /api/v2/reports/analysis/payables + /reports/analysis/chart. Driver `memory`,
 * `listAnalysis` + `resolvePlanLabels` injetados, `fastify.inject`.
 *
 * CA1: analysis/payables → AnalysisReport (totalValueOfPeriod + data[] por PLANO, com rótulo
 *      costurado, itens[] mensais do plano, costCenters[] folha com série mensal PRÓPRIA).
 * CA2: RBAC — sem `fiscal-document:read` → 403; query sem dueStart/dueEnd → 400.
 * CA3: analysis/chart → [{ id, name, total }] por PLANO.
 * CA4: plano sem ref (budgetPlanRef null) → grupo id:null, rótulo null (gracioso).
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

const PLAN_A = 'aa111111-1111-4111-8111-111111111111';
const PLAN_B = 'bb222222-2222-4222-8222-222222222222';
const CC_1 = '33333333-3333-4333-8333-333333333333';

// Rótulos que o budget-plans (autonomia do módulo) resolveria; o reports só reflete.
const LABEL_A = 'Cenário Base';
const LABEL_B = 'Programa Educação 2026 v1.0';

// Seed de rows planas (novo grão: PLANO × cc × mês) que o DTO aninha.
const ROWS: AnalysisRow[] = [
  {
    budgetPlanRef: PLAN_A,
    costCenterRef: CC_1,
    costCenterName: 'Administrativo',
    monthYear: '2026-07',
    totalCents: 100000,
  },
  {
    budgetPlanRef: PLAN_A,
    costCenterRef: CC_1,
    costCenterName: 'Administrativo',
    monthYear: '2026-08',
    totalCents: 50000,
  },
  {
    budgetPlanRef: PLAN_B,
    costCenterRef: null,
    costCenterName: null,
    monthYear: '2026-07',
    totalCents: 30000,
  },
  // título sem Plano Orçamentário — grupo id:null (gracioso, como o null-category antigo).
  {
    budgetPlanRef: null,
    costCenterRef: CC_1,
    costCenterName: 'Administrativo',
    monthYear: '2026-07',
    totalCents: 20000,
  },
];

const LABELS = new Map<string, string>([
  [PLAN_A, LABEL_A],
  [PLAN_B, LABEL_B],
]);

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const base = await buildReportsHttpDeps({ driver: 'memory' });
  const deps = {
    ...base,
    listAnalysis: () => Promise.resolve(ok(ROWS)),
    resolvePlanLabels: () => Promise.resolve(ok(LABELS)),
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
    costCenters: {
      id: string | null;
      name: string | null;
      total: number;
      itens: { monthYear: string; total: number }[];
    }[];
  }[];
}

const byMonth = (x: readonly (string | number)[], y: readonly (string | number)[]) =>
  String(x[0]).localeCompare(String(y[0]));

describe('reports/http — analysis (REP-3 · #446 — raiz = Plano Orçamentário)', () => {
  it('CA1: analysis/payables → AnalysisReport aninhado por Plano Orçamentário', async () => {
    const res = await get(PAYABLES, READER);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as AnalysisReport;
    assert.equal(body.totalValueOfPeriod, 200000, '100000+50000+30000+20000');
    assert.equal(body.data.length, 3, 'plano A + plano B + sem-plano');

    // Raiz = Plano Orçamentário A, com o rótulo costurado do budget-plans.
    const a = body.data.find((d) => d.id === PLAN_A)!;
    assert.equal(a.name, LABEL_A, 'rótulo vem do resolvePlanLabels');
    assert.equal(a.total, 150000);
    // quebra mensal do PLANO
    assert.deepEqual(
      a.itens.map((i) => [i.monthYear, i.total]).sort(byMonth),
      [
        ['2026-07', 100000],
        ['2026-08', 50000],
      ].sort(byMonth),
    );
    // folha = Centro de Custo, com série mensal PRÓPRIA (Slice A preservado).
    assert.equal(a.costCenters.length, 1);
    assert.equal(a.costCenters[0]!.id, CC_1);
    assert.equal(a.costCenters[0]!.total, 150000);
    assert.deepEqual(
      a.costCenters[0]!.itens.map((i) => [i.monthYear, i.total]).sort(byMonth),
      [
        ['2026-07', 100000],
        ['2026-08', 50000],
      ].sort(byMonth),
    );

    // Plano B (CC nulo) → rótulo do map, folha id null.
    const b = body.data.find((d) => d.id === PLAN_B)!;
    assert.equal(b.name, LABEL_B);
    assert.equal(b.total, 30000);
    assert.equal(b.costCenters[0]!.id, null);
  });

  it('CA4: título sem Plano Orçamentário → grupo id:null, rótulo null', async () => {
    const res = await get(PAYABLES, READER);
    const body = res.json() as AnalysisReport;
    const none = body.data.find((d) => d.id === null)!;
    assert.equal(none.name, null, 'sem plano → rótulo null (gracioso)');
    assert.equal(none.total, 20000);
    assert.equal(none.costCenters[0]!.id, CC_1);
  });

  it('CA2: RBAC 403 sem permissão + 400 sem dueStart/dueEnd', async () => {
    assert.equal((await get(PAYABLES, NO_PERM)).statusCode, 403);
    const bad = await get('/api/v2/reports/analysis/payables', READER);
    assert.equal(bad.statusCode, 400, bad.body);
  });

  it('CA3: analysis/chart → [{id,name,total}] por Plano Orçamentário', async () => {
    const res = await get(CHART, READER);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { id: string | null; name: string | null; total: number }[];
    assert.equal(body.length, 3);
    const a = body.find((c) => c.id === PLAN_A)!;
    assert.equal(a.name, LABEL_A);
    assert.equal(a.total, 150000);
    assert.deepEqual([...Object.keys(a)].sort(), ['id', 'name', 'total'].sort());
  });
});
