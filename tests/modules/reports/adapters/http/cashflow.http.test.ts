/**
 * W0 RED — REP / #590 "Fluxo de Caixa" (Slice A). Borda GET /api/v2/reports/cashflow — tabela de
 * Saídas (Payables) agregada por Categoria × Subcategoria em 2 baldes REALIZED/EXPECTED. RED por
 * inexistência da rota/deps no módulo `reports`.
 *
 * CA1: 200 com `{ Receivables: [], Payables: CashflowRow[] }` (shape LEGADO).
 * CA2: RBAC — sem `fiscal-document:read` → 403.
 * CA3: contrato de saída LEGADO fechado (6 colunas por linha).
 * CA4: `Receivables` é SEMPRE `[]` (financial é payables-centric; A-Receber não existe).
 * CA5..CA10: filtros (AND, id-suffixed) viram CashflowFilter; validação de borda (uuid/data/enum).
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { ok } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { buildReportsHttpDeps, reportsHttpPlugin } from '#src/modules/reports/public-api/http.ts';
import type {
  CashflowFilter,
  CashflowRow,
} from '#src/modules/reports/application/ports/cashflow-read.ts';

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

const row = (over: Partial<CashflowRow> = {}): CashflowRow => ({
  categoryRef: '22222222-2222-4222-8222-222222222222',
  categoryName: 'Aluguel',
  subcategoryRef: '5b000000-0000-4000-8000-0000005b0001',
  subcategoryName: 'Sala comercial',
  realizedCents: 150000,
  expectedCents: 300000,
  ...over,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;
// Captura o filtro que a borda repassa ao reader — prova o parse+map da querystring.
let lastFilter: CashflowFilter | undefined;

before(async () => {
  const base = await buildReportsHttpDeps({ driver: 'memory' });
  const deps = {
    ...base,
    listCashflow: (filter?: CashflowFilter) => {
      lastFilter = filter;
      return Promise.resolve(
        ok([
          row(),
          row({
            categoryRef: null,
            categoryName: null,
            subcategoryRef: null,
            subcategoryName: null,
            realizedCents: 0,
            expectedCents: 5000,
          }),
        ] as readonly CashflowRow[]),
      );
    },
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
    url: `/api/v2/reports/cashflow${query}`,
    headers: { authorization: `Bearer ${perm}` },
  });

// UUIDs válidos para os filtros de ref.
const U = {
  program: 'a0000000-0000-4000-8000-00000000a001',
  budgetPlan: 'b0000000-0000-4000-8000-00000000b001',
  account: 'c0000000-0000-4000-8000-00000000c001',
  costCenter: 'cc000000-0000-4000-8000-0000000cc001',
  category: 'ca000000-0000-4000-8000-0000000ca001',
  subCategory: '5b000000-0000-4000-8000-0000005b0001',
  entity: '5a000000-0000-4000-8000-0000005a0001',
} as const;

describe('reports/http — GET /reports/cashflow (REP · #590 · Slice A)', () => {
  it('CA1: 200 com { Receivables: [], Payables: CashflowRow[] } (shape legado)', async () => {
    const res = await get(READER);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      Receivables: unknown[];
      Payables: Record<string, unknown>[];
    };
    assert.deepEqual(body.Receivables, []);
    assert.equal(body.Payables.length, 2);
    const first = body.Payables[0]!;
    assert.equal(first['Category_id'], '22222222-2222-4222-8222-222222222222');
    assert.equal(first['Category_name'], 'Aluguel');
    assert.equal(first['SubCategory_id'], '5b000000-0000-4000-8000-0000005b0001');
    assert.equal(first['SubCategory_name'], 'Sala comercial');
    assert.equal(first['REALIZED'], 150000);
    assert.equal(first['EXPECTED'], 300000);
    // grupo sem categoria/subcategoria → refs/nomes null (degradação graciosa).
    assert.equal(body.Payables[1]!['Category_id'], null);
    assert.equal(body.Payables[1]!['SubCategory_name'], null);
    assert.equal(body.Payables[1]!['REALIZED'], 0);
    assert.equal(body.Payables[1]!['EXPECTED'], 5000);
  });

  it('CA2: RBAC — sem fiscal-document:read → 403', async () => {
    const res = await get(NO_PERM);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('CA3: contrato de saída legado fechado (6 colunas por linha)', async () => {
    const res = await get(READER);
    const body = res.json() as { Payables: Record<string, unknown>[] };
    assert.deepEqual(
      [...Object.keys(body.Payables[0]!)].sort(),
      [
        'Category_id',
        'Category_name',
        'EXPECTED',
        'REALIZED',
        'SubCategory_id',
        'SubCategory_name',
      ].sort(),
    );
  });

  it('CA4: Receivables é SEMPRE [] (mesmo shape legado da resposta)', async () => {
    const res = await get(READER);
    const body = res.json() as { Receivables: unknown[] };
    assert.deepEqual(body.Receivables, []);
  });

  it('CA5: sem query → filtro vazio (nenhuma chave)', async () => {
    lastFilter = undefined;
    const res = await get(READER);
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(lastFilter, {});
  });

  it('CA6: os 10 filtros na querystring viram o CashflowFilter (AND) repassado ao reader', async () => {
    lastFilter = undefined;
    const query =
      `?programId=${U.program}` +
      `&budgetPlanId=${U.budgetPlan}` +
      `&dueFrom=2026-01-01&dueTo=2026-07-01` +
      `&accountId=${U.account}` +
      `&costCenterId=${U.costCenter}` +
      `&categoryId=${U.category}` +
      `&subCategoryId=${U.subCategory}` +
      `&entityId=${U.entity}` +
      `&status=Reconciled`;
    const res = await get(READER, query);
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(lastFilter, {
      programRef: U.program,
      budgetPlanRef: U.budgetPlan,
      dueFrom: '2026-01-01',
      dueTo: '2026-07-01',
      debitAccountRef: U.account,
      costCenterRef: U.costCenter,
      categoryRef: U.category,
      subcategoryRef: U.subCategory,
      supplierRef: U.entity,
      status: 'Reconciled',
    });
  });

  it('CA7: filtro parcial só inclui as chaves presentes (ausente = sem restrição)', async () => {
    lastFilter = undefined;
    const res = await get(READER, `?categoryId=${U.category}&status=Paid`);
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(lastFilter, { categoryRef: U.category, status: 'Paid' });
  });

  it('CA8: os 6 valores de status são aceitos', async () => {
    for (const status of [
      'Open',
      'Approved',
      'Transmitted',
      'Paid',
      'PartiallyReconciled',
      'Reconciled',
    ]) {
      const res = await get(READER, `?status=${status}`);
      assert.equal(res.statusCode, 200, `${status}: ${res.body}`);
    }
  });

  it('CA9: status fora dos 6 (Draft/Refused/lixo) → 400', async () => {
    for (const status of ['Draft', 'Refused', 'Nope']) {
      const res = await get(READER, `?status=${status}`);
      assert.equal(res.statusCode, 400, `${status}: ${res.body}`);
    }
  });

  it('CA10: ref malformada (uuid inválido) → 400', async () => {
    const res = await get(READER, '?categoryId=not-a-uuid');
    assert.equal(res.statusCode, 400, res.body);
  });

  it('CA11: data malformada em dueFrom → 400', async () => {
    const res = await get(READER, '?dueFrom=2026-13-99');
    assert.equal(res.statusCode, 400, res.body);
  });
});
