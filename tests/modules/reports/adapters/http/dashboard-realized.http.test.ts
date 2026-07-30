/**
 * DASH-F4 (widget "Realizado x Previsto mensal" do Dashboard · parte do #112) — W0 RED · a rota.
 *
 * Borda GET /api/v2/reports/dashboard/realized — serie de 12 meses do ano para UM plano.
 * Query: `budgetPlanId` (uuid, OBRIGATORIO) + `year` (int, OBRIGATORIO). Resposta:
 *   { budgetPlanId, year, chart: [{ month, expectedCents, realizedCents }] } — chart com 12 entradas.
 * Gate = `reference:read` (FINANCIAL_PERMISSION.referenceRead) — mesmo gate dos widgets do dashboard.
 *
 * DEVE FALHAR em W0 por DOIS motivos certos:
 *   (1) import de `dashboard-realized-read.ts` (port) quebra — o port ainda nao existe;
 *   (2) a rota /reports/dashboard/realized nao esta registrada -> 404.
 *
 * Roda no `pnpm test` PURO: driver `memory`, `listDashboardRealized` injetado, `fastify.inject`.
 *
 * ASCII puro. Codigo EN, comentarios PT-BR.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { ok, err } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { buildReportsHttpDeps, reportsHttpPlugin } from '#src/modules/reports/public-api/http.ts';
import type { DashboardRealizedChart } from '#src/modules/reports/application/ports/dashboard-realized-read.ts';
import { FINANCIAL_PERMISSION } from '#src/modules/financial/public-api/permissions.ts';

const REF_READ = FINANCIAL_PERMISSION.referenceRead; // 'reference:read'
const OTHER = 'collaborator:read';
const PLAN = '10000000-0000-4000-8000-000000000001';
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
      return reply.code(403).send({ error: { code: 'forbidden', message: 'sem permissao' } });
    }
    return undefined;
  };

const CHART: DashboardRealizedChart = {
  budgetPlanId: PLAN,
  year: 2026,
  chart: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => ({
    month: m,
    expectedCents: m === 3 ? 1000 : 0,
    realizedCents: m === 3 ? 250 : 0,
  })),
};

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let happy: AppHandle;
let broken: AppHandle;

const build = async (
  listDashboardRealized: () => Promise<
    | ReturnType<typeof ok<DashboardRealizedChart>>
    | ReturnType<typeof err<'dashboard-realized-read-unavailable'>>
  >,
): Promise<AppHandle> => {
  const base = await buildReportsHttpDeps({ driver: 'memory' });
  const deps = { ...base, listDashboardRealized };
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [reportsHttpPlugin(deps, { requireAuth, authorize })],
  });
  return { app, teardown: () => app.close() };
};

before(async () => {
  happy = await build(() => Promise.resolve(ok(CHART)));
  broken = await build(() => Promise.resolve(err('dashboard-realized-read-unavailable')));
});

after(async () => {
  await happy.teardown();
  await broken.teardown();
});

const get = (handle: AppHandle, url: string, perms: string): Promise<LightMyRequestResponse> =>
  handle.app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${perms}` } });

const base = `/api/v2/reports/dashboard/realized`;

describe('reports/http - GET /reports/dashboard/realized (shape)', () => {
  it('200 com { budgetPlanId, year, chart:[12] } sob reference:read', async () => {
    const res = await get(happy, `${base}?budgetPlanId=${PLAN}&year=2026`, REF_READ);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as DashboardRealizedChart;
    assert.deepEqual(Object.keys(body).sort(), ['budgetPlanId', 'chart', 'year']);
    assert.equal(body.budgetPlanId, PLAN);
    assert.equal(body.year, 2026);
    assert.equal(body.chart.length, 12);
    assert.deepEqual(
      body.chart.map((p) => p.month),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    );
    const march = body.chart.find((p) => p.month === 3)!;
    assert.equal(march.expectedCents, 1000);
    assert.equal(march.realizedCents, 250);
  });

  it('cada ponto tem exatamente {month, expectedCents, realizedCents}', async () => {
    const res = await get(happy, `${base}?budgetPlanId=${PLAN}&year=2026`, REF_READ);
    const body = res.json() as DashboardRealizedChart;
    assert.deepEqual(Object.keys(body.chart[0]!).sort(), [
      'expectedCents',
      'month',
      'realizedCents',
    ]);
  });
});

describe('reports/http - GET /reports/dashboard/realized (validacao Zod strict)', () => {
  it('sem budgetPlanId -> 400', async () => {
    const res = await get(happy, `${base}?year=2026`, REF_READ);
    assert.equal(res.statusCode, 400, res.body);
  });

  it('budgetPlanId nao-uuid -> 400', async () => {
    const res = await get(happy, `${base}?budgetPlanId=not-a-uuid&year=2026`, REF_READ);
    assert.equal(res.statusCode, 400, res.body);
  });

  it('sem year -> 400', async () => {
    const res = await get(happy, `${base}?budgetPlanId=${PLAN}`, REF_READ);
    assert.equal(res.statusCode, 400, res.body);
  });

  it('year nao-inteiro -> 400', async () => {
    const res = await get(happy, `${base}?budgetPlanId=${PLAN}&year=abc`, REF_READ);
    assert.equal(res.statusCode, 400, res.body);
  });

  it('parametro desconhecido -> 400 (querystring .strict())', async () => {
    const res = await get(happy, `${base}?budgetPlanId=${PLAN}&year=2026&foo=bar`, REF_READ);
    assert.equal(res.statusCode, 400, res.body);
  });
});

describe('reports/http - GET /reports/dashboard/realized (gate reference:read)', () => {
  it('sem reference:read -> 403', async () => {
    const res = await get(happy, `${base}?budgetPlanId=${PLAN}&year=2026`, OTHER);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('com reference:read -> 200', async () => {
    const res = await get(happy, `${base}?budgetPlanId=${PLAN}&year=2026`, REF_READ);
    assert.equal(res.statusCode, 200, res.body);
  });
});

describe('reports/http - GET /reports/dashboard/realized (fail-closed)', () => {
  it('fonte indisponivel -> 503', async () => {
    const res = await get(broken, `${base}?budgetPlanId=${PLAN}&year=2026`, REF_READ);
    assert.equal(res.statusCode, 503, res.body);
  });
});
