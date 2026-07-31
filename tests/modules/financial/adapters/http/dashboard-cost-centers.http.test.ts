/**
 * DASH-F1 (#241) · borda HTTP: GET /api/v2/financial/dashboard/cost-centers.
 * KPI "Despesas Pagas no período" + Top Centro de Custo + Distribuição. RBAC: reference:read
 * (paridade com os demais widgets do Dashboard — #239/#242).
 *
 * A referência de "agora" vem do clock da composição — aqui injetamos um `ClockFixed` determinístico
 * via `FinancialCompositionConfig.clock` e um reader FAKE via `dashboardCostCentersReader` que CAPTURA
 * as janelas recebidas. Assim provamos que o handler passa as janelas M-1/M-2 corretas (computadas
 * por `comparisonWindows(clock.now())`) ao reader — sem MySQL. Molde: `recent-payments.http.test.ts`.
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
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';
import { ok, type Result } from '#src/shared/primitives/result.ts';
import type {
  DashboardCostCenterRow,
  DashboardCostCentersReader,
  DashboardCostCentersWindows,
} from '#src/modules/financial/public-api/dashboard-cost-centers-projection.ts';

const READER = 'reference:read';
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

// Reader fake: captura as janelas recebidas e devolve o seed (independe de MySQL).
const capturingReader = (
  seed: readonly DashboardCostCenterRow[],
): { reader: DashboardCostCentersReader; captured: () => DashboardCostCentersWindows | null } => {
  let last: DashboardCostCentersWindows | null = null;
  return {
    captured: () => last,
    reader: {
      list: (
        windows: DashboardCostCentersWindows,
      ): Promise<Result<readonly DashboardCostCenterRow[], string>> => {
        last = windows;
        return Promise.resolve(ok(seed));
      },
      close: (): Promise<void> => Promise.resolve(undefined),
    },
  };
};

const SEED: readonly DashboardCostCenterRow[] = [
  { ref: 'cc1', name: 'Alpha', m1Cents: 60000, m2Cents: 40000 },
  { ref: 'cc2', name: 'Beta', m1Cents: 30000, m2Cents: 50000 },
  { ref: null, name: null, m1Cents: 10000, m2Cents: 0 },
];

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  captured: () => DashboardCostCentersWindows | null;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const { reader, captured } = capturingReader(SEED);
  const base = await buildFinancialHttpDeps({
    driver: 'memory',
    // 2026-07-15 → M-1 = junho/2026 [2026-06-01, 2026-07-01); M-2 = maio/2026 [2026-05-01, 2026-06-01).
    clock: ClockFixed(new Date('2026-07-15T12:00:00.000Z')),
    dashboardCostCentersReader: reader,
  });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(base, { requireAuth, authorize })],
  });
  handle = {
    app,
    captured,
    teardown: async () => {
      await app.close();
      await base.shutdown();
    },
  };
});

after(async () => {
  await handle.teardown();
});

describe('financial/http — GET /dashboard/cost-centers (#241)', () => {
  it('reference:read → 200 com KPI + top + distribuição montados pelo assembler', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/dashboard/cost-centers',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      totalExpenses: number;
      variation: { absoluteCents: number; percentage: { kind: string; percent?: number } };
      topCostCenter: { ref: string | null; name: string | null; totalCents: number } | null;
      distribution: readonly {
        ref: string | null;
        name: string | null;
        totalCents: number;
        percentage: number;
      }[];
    };

    assert.equal(body.totalExpenses, 100000);
    assert.equal(body.variation.absoluteCents, 100000 - 90000);
    assert.equal(body.variation.percentage.kind, 'value');
    assert.deepEqual(body.topCostCenter, { ref: 'cc1', name: 'Alpha', totalCents: 60000 });
    assert.equal(body.distribution.length, 3);
    assert.deepEqual(
      body.distribution.map((d) => d.totalCents),
      [60000, 30000, 10000],
    );
    // Serializa a união Percentage COMO ESTÁ (a borda não formata "12,5%").
    if (body.variation.percentage.kind === 'value') {
      assert.equal(typeof body.variation.percentage.percent, 'number');
    }
  });

  it('handler passa as janelas M-1/M-2 corretas (comparisonWindows do clock fixo) ao reader', async () => {
    await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/dashboard/cost-centers',
      headers: { authorization: `Bearer ${READER}` },
    });
    const w = handle.captured();
    assert.ok(w !== null, 'o reader deve ter recebido janelas');
    const iso = (d: Date): string => d.toISOString().slice(0, 10);
    assert.equal(iso(w.m1Start), '2026-06-01');
    assert.equal(iso(w.m1End), '2026-07-01');
    assert.equal(iso(w.m2Start), '2026-05-01');
    assert.equal(iso(w.m2End), '2026-06-01');
  });

  it('sem reference:read → 403', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/dashboard/cost-centers',
      headers: { authorization: 'Bearer fiscal-document:read' },
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it('sem despesas pagas → 200 com totais zerados, distribution vazia, topCostCenter null', async () => {
    const { reader } = capturingReader([]);
    const base = await buildFinancialHttpDeps({
      driver: 'memory',
      clock: ClockFixed(new Date('2026-07-15T12:00:00.000Z')),
      dashboardCostCentersReader: reader,
    });
    const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
    const app = await buildApp({
      config,
      routes: [financialHttpPlugin(base, { requireAuth, authorize })],
    });
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/financial/dashboard/cost-centers',
        headers: { authorization: `Bearer ${READER}` },
      });
      assert.equal(res.statusCode, 200, res.body);
      assert.deepEqual(res.json(), {
        totalExpenses: 0,
        variation: { absoluteCents: 0, percentage: { kind: 'no-change' } },
        topCostCenter: null,
        distribution: [],
      });
    } finally {
      await app.close();
      await base.shutdown();
    }
  });
});
