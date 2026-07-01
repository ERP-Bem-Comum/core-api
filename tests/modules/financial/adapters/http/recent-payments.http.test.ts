/**
 * FIN-DASHBOARD-RECENT-PAYMENTS (#239) · borda HTTP: GET /api/v2/financial/dashboard/recent-payments.
 * Widget "Últimos pagamentos" — Top-5 títulos Pagos por `paidAt` desc. RBAC: reference:read (mesma
 * permissão de GET /financial/categories — espelha categories.http.test.ts).
 *
 * Seed: o read-model `fin_payable_view` é normalmente alimentado de forma ASSÍNCRONA pelo worker
 * `payable-view-projection` (ADR-0022) — não pelas rotas de escrita deste composition root. Este
 * teste HTTP semeia direto o `PayableViewStore` in-memory via `applyPayableEvent` (mesmos fixtures
 * de `tests/modules/financial/application/use-cases/recent-payments.test.ts`) e injeta a store via
 * `FinancialCompositionConfig.payableViewStore` (seam adicionada na composição — ver composition.ts).
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
import { applyPayableEvent } from '#src/modules/financial/application/use-cases/apply-payable-event.ts';
import { createInMemoryPayableViewStore } from '#src/modules/financial/adapters/persistence/repos/payable-view-store.in-memory.ts';

const READER = 'reference:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const SUP = '11111111-1111-4111-8111-111111111111';
const ACC = '22222222-2222-4222-8222-222222222222';

// UUID v4-ish determinístico por seed numérico (mesmo padrão de recent-payments.test.ts, só que
// com IDs distintos por título — o schema de resposta exige `z.uuid()`).
const uuid = (n: number): string => {
  const h = String(n).padStart(12, '0');
  return `dddddddd-dddd-4ddd-8ddd-${h}`;
};

const documentSavedPayload = (payableId: string, documentId: string, valueCents: string) =>
  JSON.stringify({
    documentId,
    supplierRef: SUP,
    contractRef: null,
    categoryRef: null,
    costCenterRef: null,
    programRef: null,
    debitAccountRef: ACC,
    payables: [
      {
        payableId,
        kind: 'Parent',
        retentionType: null,
        valueCents,
        dueDate: '2026-07-01',
        status: 'Open',
      },
    ],
  });

const paidPayload = (payableId: string, documentId: string, paidAtIso: string) =>
  JSON.stringify({ documentId, payableId, paidAt: paidAtIso });

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

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

before(async () => {
  const store = createInMemoryPayableViewStore();
  const apply = applyPayableEvent({ store });

  // 6 títulos pagos em datas distintas (mais que o Top-5) + 1 aberto (não deve aparecer).
  const paidDays: readonly [number, string][] = [
    [1, '2026-06-10T00:00:00.000Z'],
    [2, '2026-06-25T00:00:00.000Z'],
    [3, '2026-06-18T00:00:00.000Z'],
    [4, '2026-06-30T00:00:00.000Z'],
    [5, '2026-06-05T00:00:00.000Z'],
    [6, '2026-06-22T00:00:00.000Z'],
  ];
  for (const [n, day] of paidDays) {
    const payableId = uuid(n);
    const documentId = uuid(100 + n);
    await apply({
      eventType: 'DocumentSaved',
      payload: documentSavedPayload(payableId, documentId, '77500'),
    });
    const paid = await apply({
      eventType: 'PayableManuallyPaid',
      payload: paidPayload(payableId, documentId, day),
    });
    assert.equal(paid.ok, true, 'seed: PayableManuallyPaid deve aplicar sem erro');
  }
  // Título aberto (não pago) — não deve aparecer no widget.
  await apply({
    eventType: 'DocumentSaved',
    payload: documentSavedPayload(uuid(7), uuid(107), '1000'),
  });

  const base = await buildFinancialHttpDeps({ driver: 'memory', payableViewStore: store });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(base, { requireAuth, authorize })],
  });
  handle = {
    app,
    teardown: async () => {
      await app.close();
      await base.shutdown();
    },
  };
});

after(async () => {
  await handle.teardown();
});

describe('financial/http — GET /dashboard/recent-payments (#239)', () => {
  it('reference:read → 200 com Top-5 pagos, ordenados por paidAt desc', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/dashboard/recent-payments',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as readonly {
      payableId: string;
      documentId: string;
      supplierRef: string | null;
      debitAccountRef: string | null;
      valueCents: string;
      paidAt: string | null;
    }[];

    assert.equal(body.length, 5, 'Top-5 — deve truncar os 6 pagos semeados');
    // Ordem esperada por paidAt desc: 30, 25, 22, 18, 10 (05 fica de fora — 6º lugar).
    assert.deepEqual(
      body.map((i) => i.paidAt),
      ['2026-06-30', '2026-06-25', '2026-06-22', '2026-06-18', '2026-06-10'],
    );
    for (const item of body) {
      assert.equal(typeof item.payableId, 'string');
      assert.equal(typeof item.documentId, 'string');
      assert.equal(item.supplierRef, SUP);
      assert.equal(item.debitAccountRef, ACC);
      // Money serializado como string de centavos (convenção do módulo — não number).
      assert.equal(item.valueCents, '77500');
      // DTO lean — nunca expõe o resto da linha do read-model.
      assert.equal(Object.prototype.hasOwnProperty.call(item, 'status'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(item, 'dueDate'), false);
      assert.equal(Object.prototype.hasOwnProperty.call(item, 'kind'), false);
    }
  });

  it('sem reference:read → 403', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/dashboard/recent-payments',
      headers: { authorization: 'Bearer fiscal-document:read' },
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it('read-model sem pagos → 200 com array vazio (primeira renderização)', async () => {
    const emptyStore = createInMemoryPayableViewStore();
    const base = await buildFinancialHttpDeps({ driver: 'memory', payableViewStore: emptyStore });
    const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
    const app = await buildApp({
      config,
      routes: [financialHttpPlugin(base, { requireAuth, authorize })],
    });
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/financial/dashboard/recent-payments',
        headers: { authorization: `Bearer ${READER}` },
      });
      assert.equal(res.statusCode, 200, res.body);
      assert.deepEqual(res.json(), []);
    } finally {
      await app.close();
      await base.shutdown();
    }
  });
});
