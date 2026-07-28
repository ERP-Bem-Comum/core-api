/**
 * W0 — REPORTS-GENERAL-REPORT (REP-6 · #442 · Slice A). Borda GET /api/v2/reports/generalReport —
 * linhas PLANAS PAGINADAS de títulos a-pagar (fin_payable_view), single-module financial.
 *
 * CA1: 200 com página { items, page, pageSize, total }.
 * CA2: RBAC — sem `fiscal-document:read` → 403.
 * CA3: `tipo` sempre 'a-pagar'; `code` = document_number; colunas cross-módulo (B/C/D) AUSENTES.
 * CA4: paginação (page/limit) repassada ao reader.
 * CA5: os 9 filtros (id na querystring) viram GeneralReportFilter (id → ref) repassado (AND).
 * CA6: filtro parcial só inclui as chaves presentes.
 * CA7/CA8: enum de status (6 aceitos; Draft/Refused/lixo → 400).
 * CA9/CA10: ref malformada / data malformada → 400.
 * CA11: `columns` CSV — válido aceito; token fora do catálogo → 400.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { ok } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { buildReportsHttpDeps, reportsHttpPlugin } from '#src/modules/reports/public-api/http.ts';
import type {
  GeneralReportFilter,
  GeneralReportPagination,
  GeneralReportRow,
} from '#src/modules/reports/application/ports/general-report-read.ts';

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

const row = (over: Partial<GeneralReportRow> = {}): GeneralReportRow => ({
  payableId: 'f1000000-0000-4000-8000-0000000000f1',
  documentId: 'dc000000-0000-4000-8000-00000000d001',
  code: 'NFS 1234',
  tipo: 'a-pagar',
  dueDate: '2026-07-01',
  payeeKind: 'supplier',
  supplierRef: '11111111-1111-4111-8111-111111111111',
  supplierName: 'Fornecedor Alpha',
  financierName: null,
  collaboratorName: null,
  costCenterRef: '33333333-3333-4333-8333-333333333333',
  costCenterName: 'Administrativo',
  categoryRef: '22222222-2222-4222-8222-222222222222',
  categoryName: 'Aluguel',
  subcategoryRef: '44444444-4444-4444-8444-444444444444',
  subcategoryName: 'Aluguel Sede',
  valueCents: 300000,
  contractRef: '55555555-5555-4555-8555-555555555555',
  ...over,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;
let lastFilter: GeneralReportFilter | undefined;
let lastPagination: GeneralReportPagination | undefined;

before(async () => {
  const base = await buildReportsHttpDeps({ driver: 'memory' });
  const deps = {
    ...base,
    listGeneralReport: (filter: GeneralReportFilter, pagination: GeneralReportPagination) => {
      lastFilter = filter;
      lastPagination = pagination;
      return Promise.resolve(
        ok({
          items: [
            row(),
            row({
              payableId: 'f2000000-0000-4000-8000-0000000000f2',
              code: null,
              supplierRef: null,
              supplierName: null,
              costCenterRef: null,
              costCenterName: null,
              categoryRef: null,
              categoryName: null,
              subcategoryRef: null,
              subcategoryName: null,
              contractRef: null,
              valueCents: 5000,
            }),
          ],
          page: pagination.page,
          pageSize: pagination.limit,
          total: 42,
        }),
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
    url: `/api/v2/reports/generalReport${query}`,
    headers: { authorization: `Bearer ${perm}` },
  });

const U = {
  program: 'a0000000-0000-4000-8000-00000000a001',
  budgetPlan: 'b0000000-0000-4000-8000-00000000b001',
  account: 'c0000000-0000-4000-8000-00000000c001',
  costCenter: 'cc000000-0000-4000-8000-0000000cc001',
  category: 'ca000000-0000-4000-8000-0000000ca001',
  subcategory: '5b000000-0000-4000-8000-0000005b0001',
  entity: '5a000000-0000-4000-8000-0000005a0001',
} as const;

describe('reports/http — GET /reports/generalReport (REP-6 · #442 · Slice A)', () => {
  it('CA1: 200 com página { items, page, pageSize, total }', async () => {
    const res = await get(READER);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      items: GeneralReportRow[];
      page: number;
      pageSize: number;
      total: number;
    };
    assert.equal(body.items.length, 2);
    assert.equal(body.total, 42);
    assert.equal(body.page, 1);
    assert.equal(body.pageSize, 50);
  });

  it('CA2: RBAC — sem fiscal-document:read → 403', async () => {
    const res = await get(NO_PERM);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('CA3: tipo sempre a-pagar; code = document_number; sem colunas cross-módulo (B/C/D)', async () => {
    const res = await get(READER);
    const body = res.json() as { items: Record<string, unknown>[] };
    const first = body.items[0]!;
    assert.equal(first['tipo'], 'a-pagar');
    assert.equal(first['code'], 'NFS 1234');
    // Contrato de saída: 15 colunas do Slice A + 3 do Slice B (payeeKind + financierName +
    // collaboratorName) = 18 chaves. PIX/Bancários (Slice C) e Número do Contrato (Slice D) fora.
    assert.deepEqual(
      [...Object.keys(first)].sort(),
      [
        'categoryName',
        'categoryRef',
        'code',
        'collaboratorName',
        'contractRef',
        'costCenterName',
        'costCenterRef',
        'documentId',
        'dueDate',
        'financierName',
        'payableId',
        'payeeKind',
        'subcategoryName',
        'subcategoryRef',
        'supplierName',
        'supplierRef',
        'tipo',
        'valueCents',
      ].sort(),
    );
    // Colunas de Slices C/D ainda não vazam no shape.
    for (const k of ['pix', 'bankInfo', 'contractNumber']) {
      assert.equal(k in first, false, `coluna cross-módulo ${k} não deve estar presente`);
    }
    // Linha sem refs → nomes/refs null (degradação graciosa).
    assert.equal(body.items[1]!['code'], null);
    assert.equal(body.items[1]!['subcategoryName'], null);
  });

  it('CA4: page/limit da querystring viram a paginação repassada ao reader', async () => {
    lastPagination = undefined;
    const res = await get(READER, '?page=3&limit=10');
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(lastPagination, { page: 3, limit: 10 });
    const body = res.json() as { page: number; pageSize: number };
    assert.equal(body.page, 3);
    assert.equal(body.pageSize, 10);
  });

  it('CA4b: sem page/limit → defaults (page 1, limit 50)', async () => {
    lastPagination = undefined;
    const res = await get(READER);
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(lastPagination, { page: 1, limit: 50 });
  });

  it('CA5: os 9 filtros (id na query) viram GeneralReportFilter (id → ref, AND) repassado', async () => {
    lastFilter = undefined;
    const query =
      `?programId=${U.program}` +
      `&budgetPlanId=${U.budgetPlan}` +
      `&dueFrom=2026-01-01&dueTo=2026-07-01` +
      `&accountId=${U.account}` +
      `&costCenterId=${U.costCenter}` +
      `&categoryId=${U.category}` +
      `&subCategoryId=${U.subcategory}` +
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
      subcategoryRef: U.subcategory,
      supplierRef: U.entity,
      status: 'Reconciled',
    });
  });

  it('CA6: filtro parcial só inclui as chaves presentes (ausente = sem restrição)', async () => {
    lastFilter = undefined;
    const res = await get(
      READER,
      `?entityId=${U.entity}&status=Paid&search=nota&order=dueDate:asc`,
    );
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(lastFilter, {
      supplierRef: U.entity,
      status: 'Paid',
      search: 'nota',
      order: 'dueDate:asc',
    });
  });

  it('CA7: os 6 valores de status são aceitos', async () => {
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

  it('CA8: status fora dos 6 (Draft/Refused/lixo) → 400', async () => {
    for (const status of ['Draft', 'Refused', 'Nope']) {
      const res = await get(READER, `?status=${status}`);
      assert.equal(res.statusCode, 400, `${status}: ${res.body}`);
    }
  });

  it('CA9: ref malformada (uuid inválido) → 400', async () => {
    const res = await get(READER, '?entityId=not-a-uuid');
    assert.equal(res.statusCode, 400, res.body);
  });

  it('CA10: data malformada em dueFrom → 400', async () => {
    const res = await get(READER, '?dueFrom=2026-13-99');
    assert.equal(res.statusCode, 400, res.body);
  });

  it('CA11: columns CSV válido é aceito; token fora do catálogo → 400', async () => {
    const okRes = await get(READER, '?columns=code,dueDate,value,financier');
    assert.equal(okRes.statusCode, 200, okRes.body);
    const badRes = await get(READER, '?columns=code,unknownColumn');
    assert.equal(badRes.statusCode, 400, badRes.body);
  });
});

// Slice B (#442): FINANCIADOR/COLABORADOR (nomes) preenchidos por kind. App próprio com um reader
// semeando uma linha de cada kind — o nome cross-módulo já vem costurado na página do port.
describe('reports/http — GET /reports/generalReport (REP-6 · #442 · Slice B: Financiador/Colaborador)', () => {
  let kindHandle: AppHandle;

  before(async () => {
    const base = await buildReportsHttpDeps({ driver: 'memory' });
    const deps = {
      ...base,
      listGeneralReport: (_filter: GeneralReportFilter, pagination: GeneralReportPagination) =>
        Promise.resolve(
          ok({
            items: [
              row({
                payableId: 'f1000000-0000-4000-8000-0000000000f1',
                payeeKind: 'financier',
                supplierRef: 'e1000000-0000-4000-8000-0000000000e1',
                supplierName: null,
                financierName: 'Financiador BNDES',
                collaboratorName: null,
              }),
              row({
                payableId: 'f2000000-0000-4000-8000-0000000000f2',
                payeeKind: 'collaborator',
                supplierRef: 'e2000000-0000-4000-8000-0000000000e2',
                supplierName: null,
                financierName: null,
                collaboratorName: 'Colaborador João',
              }),
              row({
                payableId: 'f3000000-0000-4000-8000-0000000000f3',
                payeeKind: 'supplier',
                supplierName: 'Fornecedor Alpha',
                financierName: null,
                collaboratorName: null,
              }),
            ],
            page: pagination.page,
            pageSize: pagination.limit,
            total: 3,
          }),
        ),
    };
    const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
    const app = await buildApp({
      config,
      routes: [reportsHttpPlugin(deps, { requireAuth, authorize })],
    });
    kindHandle = { app, teardown: () => app.close() };
  });

  after(async () => {
    await kindHandle.teardown();
  });

  it('shape de 18 chaves + preenchimento por kind (financier/collaborator/supplier)', async () => {
    const res = await kindHandle.app.inject({
      method: 'GET',
      url: '/api/v2/reports/generalReport',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: Record<string, unknown>[] };
    assert.equal(body.items.length, 3);

    // 18 chaves em toda linha.
    for (const line of body.items) {
      assert.equal(Object.keys(line).length, 18, JSON.stringify(line));
    }

    const [fin, col, sup] = body.items;
    // Financier: financierName preenchido; collaboratorName e supplierName null.
    assert.equal(fin!['payeeKind'], 'financier');
    assert.equal(fin!['financierName'], 'Financiador BNDES');
    assert.equal(fin!['collaboratorName'], null);
    assert.equal(fin!['supplierName'], null);
    // Collaborator: collaboratorName preenchido; financierName e supplierName null.
    assert.equal(col!['payeeKind'], 'collaborator');
    assert.equal(col!['collaboratorName'], 'Colaborador João');
    assert.equal(col!['financierName'], null);
    assert.equal(col!['supplierName'], null);
    // Supplier: supplierName local; financier/collaborator null.
    assert.equal(sup!['payeeKind'], 'supplier');
    assert.equal(sup!['supplierName'], 'Fornecedor Alpha');
    assert.equal(sup!['financierName'], null);
    assert.equal(sup!['collaboratorName'], null);
  });
});
