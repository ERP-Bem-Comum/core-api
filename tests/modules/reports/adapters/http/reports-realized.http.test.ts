/**
 * REPORTS-REALIZED-ENDPOINT (S6 do epico #502 · fatia final de REPORTS-REALIZED-VS-PLANNED) —
 * W0 RED · Frente B (a rota).
 *
 * Borda GET /api/v2/reports/realized — a arvore Realizado x Planejado (centro -> categoria ->
 * subcategoria), 3 totais por no + months[12]. Este arquivo cobre a ROTA (shape sobre HTTP, Zod
 * strict, gate de permissao, regressao zero). A LOGICA de costura/somas vive no teste irmao
 * `adapters/persistence/realized-read.stitch.test.ts` (funcao pura).
 *
 * DEVE FALHAR em W0 por DOIS motivos, os dois "certos":
 *   (1) o import de topo de `#src/modules/reports/application/ports/realized-read.ts` quebra
 *       (ERR_MODULE_NOT_FOUND) — o port ainda nao existe;
 *   (2) mesmo que o import passasse, a rota /reports/realized nao esta registrada -> 404.
 * RED por inexistencia de port/rota, nunca assercao frouxa.
 *
 * Roda no `pnpm test` PURO: driver `memory`, `listRealized` injetado, `fastify.inject`.
 *
 * ASCII puro. Codigo EN, comentarios PT-BR.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { ok } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { buildReportsHttpDeps, reportsHttpPlugin } from '#src/modules/reports/public-api/http.ts';
import type { RealizedReport } from '#src/modules/reports/application/ports/realized-read.ts';
import { BUDGET_PLAN_PERMISSION } from '#src/modules/budget-plans/public-api/permissions.ts';
import { FINANCIAL_PERMISSION } from '#src/modules/financial/public-api/permissions.ts';

// ── Assinatura pinada pelo W0 ────────────────────────────────────────────────────────────────────
//   Nova dep na ReportsHttpDeps:  listRealized: RealizedReadPort['list']
//     = (filter: RealizedFilter) => Promise<Result<RealizedReport, 'realized-read-unavailable'>>
//   RealizedFilter = Readonly<{ year: number; programRef?; budgetPlanId?;
//                               partnerStateRef?; partnerMunicipalityRef? }>  // year OBRIGATORIO
//   Rota: GET /api/v2/reports/realized?year=YYYY[&programId&budgetPlanId&partnerStateId&partnerMunicipalityId]
//   Querystring Zod .strict(): year obrigatorio (sem ele -> 400); parametro desconhecido -> 400.
//   Gate (CA11): requer AS DUAS permissoes (AND) — budget-plan:read + fiscal-document:read
//     (o relatorio expoe orcado E realizado; ver so um lado nao faz sentido). Dois `authorize()`
//     no preHandler. `payable:read` NAO existe no catalogo do financial — nao usar.

const BUDGET_READ = BUDGET_PLAN_PERMISSION.read; // 'budget-plan:read'
const FIN_READ = FINANCIAL_PERMISSION.read; // 'fiscal-document:read'
const BOTH = `${BUDGET_READ},${FIN_READ}`;
const COLLAB_READ = 'collaborator:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const requireAuth: preHandlerAsyncHookHandler = async (req, reply) => {
  const auth = req.headers.authorization;
  if (typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return reply.code(401).send({ error: { code: 'unauthorized', message: 'sem token' } });
  }
  (req as unknown as { userId: string }).userId = TEST_USER_ID;
  return undefined;
};
// `authorize(p)` passa apenas se `p` estiver na lista do Bearer. Encadear dois `authorize` no
// preHandler exige AS DUAS (AND) — exatamente o gate do relatorio.
const authorize =
  (permission: string): preHandlerAsyncHookHandler =>
  async (req, reply) => {
    const perms = (req.headers.authorization ?? '').replace('Bearer ', '').split(',');
    if (!perms.includes(permission)) {
      return reply.code(403).send({ error: { code: 'forbidden', message: 'sem permissao' } });
    }
    return undefined;
  };

// Fixture de saida ja montada (a rota so serializa; a costura tem teste proprio). 1 centro, 1
// categoria, 1 subcategoria — no NOVO grao a folha carrega o numero (realized/provisioned != 0).
const month = (m: number, expected: number, realized: number, provisioned: number) => ({
  month: m,
  expected,
  realized,
  provisioned,
});
const zeros = (skip: number): ReturnType<typeof month>[] =>
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].filter((m) => m !== skip).map((m) => month(m, 0, 0, 0));

const REPORT: RealizedReport = {
  totalExpected: 1000,
  totalRealized: 250,
  totalProvisioned: 0,
  costCenters: [
    {
      id: 'cc100000-0000-4000-8000-0000000000c1',
      name: 'Centro 1',
      budgetPlanId: '10000000-0000-4000-8000-000000000001',
      totalExpected: 1000,
      totalRealized: 250,
      totalProvisioned: 0,
      categories: [
        {
          id: 'ca100000-0000-4000-8000-0000000000a1',
          name: 'Categoria 1',
          totalExpected: 1000,
          totalRealized: 250,
          totalProvisioned: 0,
          months: [month(3, 1000, 250, 0), ...zeros(3)],
          subCategories: [
            {
              id: '5b100000-0000-4000-8000-0000000000b1',
              name: 'Sub 1',
              totalExpected: 1000,
              totalRealized: 250,
              totalProvisioned: 0,
              // A FOLHA carrega o numero no novo grao (nao mais zero).
              months: [month(3, 1000, 250, 0), ...zeros(3)],
            },
          ],
        },
      ],
    },
  ],
};

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const base = await buildReportsHttpDeps({ driver: 'memory' });
  const deps = {
    ...base,
    listRealized: () => Promise.resolve(ok(REPORT)),
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

const get = (url: string, perms: string): Promise<LightMyRequestResponse> =>
  handle.app.inject({ method: 'GET', url, headers: { authorization: `Bearer ${perms}` } });

describe('reports/http - GET /reports/realized (CA1 arvore + shape)', () => {
  it('CA1: 200 com totais gerais + arvore de 3 niveis; months[12] em categoria e subcategoria', async () => {
    const res = await get('/api/v2/reports/realized?year=2026', BOTH);
    assert.equal(res.statusCode, 200, res.body);

    const body = res.json() as RealizedReport;
    assert.deepEqual(Object.keys(body).sort(), [
      'costCenters',
      'totalExpected',
      'totalProvisioned',
      'totalRealized',
    ]);
    assert.equal(body.costCenters.length, 1);
    const cc = body.costCenters[0]!;
    assert.equal(typeof cc.budgetPlanId, 'string');
    assert.equal(cc.categories.length, 1);
    const cat = cc.categories[0]!;
    assert.equal(cat.months.length, 12, 'categoria expoe os 12 meses');
    assert.equal(cat.subCategories.length, 1);
    assert.equal(cat.subCategories[0]!.months.length, 12, 'subcategoria expoe os 12 meses');
  });

  it('CA3/CA4: a folha (subcategoria) atravessa a fronteira COM numero (realized != 0)', async () => {
    const res = await get('/api/v2/reports/realized?year=2026', BOTH);
    const body = res.json() as RealizedReport;
    const sub = body.costCenters[0]!.categories[0]!.subCategories[0]!;
    assert.equal(sub.totalRealized, 250, 'a folha carrega o realizado no novo grao (nao zero)');
    const march = sub.months.find((m) => m.month === 3)!;
    assert.equal(march.realized, 250, 'o realizado da folha aparece no mes correto');
  });

  it('CA1: cada RealizedMonth tem exatamente {month, expected, realized, provisioned}', async () => {
    const res = await get('/api/v2/reports/realized?year=2026', BOTH);
    const body = res.json() as RealizedReport;
    const someMonth = body.costCenters[0]!.categories[0]!.months[0]!;
    assert.deepEqual(Object.keys(someMonth).sort(), [
      'expected',
      'month',
      'provisioned',
      'realized',
    ]);
  });

  it('CA5 (na fronteira): total geral == soma dos centros nas 3 medidas', async () => {
    const res = await get('/api/v2/reports/realized?year=2026', BOTH);
    const body = res.json() as RealizedReport;
    const sum = (k: 'totalExpected' | 'totalRealized' | 'totalProvisioned'): number =>
      body.costCenters.reduce((a, c) => a + c[k], 0);
    assert.equal(sum('totalExpected'), body.totalExpected);
    assert.equal(sum('totalRealized'), body.totalRealized);
    assert.equal(sum('totalProvisioned'), body.totalProvisioned);
  });
});

describe('reports/http - GET /reports/realized (CA8 Zod strict: year obrigatorio)', () => {
  it('sem year -> 400 (Zod strict)', async () => {
    const res = await get('/api/v2/reports/realized', BOTH);
    assert.equal(res.statusCode, 400, res.body);
  });

  it('year presente -> 200', async () => {
    const res = await get('/api/v2/reports/realized?year=2026', BOTH);
    assert.equal(res.statusCode, 200, res.body);
  });

  it('parametro desconhecido -> 400 (querystring .strict())', async () => {
    const res = await get('/api/v2/reports/realized?year=2026&foo=bar', BOTH);
    assert.equal(res.statusCode, 400, res.body);
  });
});

describe('reports/http - GET /reports/realized (CA11 gate: budget-plan:read AND fiscal-document:read)', () => {
  it('sem permissao nenhuma -> 403', async () => {
    const res = await get('/api/v2/reports/realized?year=2026', COLLAB_READ);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('so budget-plan:read (falta o financial) -> 403', async () => {
    const res = await get('/api/v2/reports/realized?year=2026', BUDGET_READ);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('so fiscal-document:read (falta o orcado) -> 403', async () => {
    const res = await get('/api/v2/reports/realized?year=2026', FIN_READ);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('as DUAS permissoes -> 200', async () => {
    const res = await get('/api/v2/reports/realized?year=2026', BOTH);
    assert.equal(res.statusCode, 200, res.body);
  });
});

describe('reports/http - CA10 regressao zero nos relatorios existentes', () => {
  it('GET /reports/team segue 200 sob collaborator:read', async () => {
    const res = await get('/api/v2/reports/team', COLLAB_READ);
    assert.equal(res.statusCode, 200, res.body);
  });

  it('GET /reports/analysis/chart segue 200 sob fiscal-document:read', async () => {
    const res = await get(
      '/api/v2/reports/analysis/chart?dueStart=2026-01-01&dueEnd=2026-12-31',
      FIN_READ,
    );
    assert.equal(res.statusCode, 200, res.body);
  });
});
