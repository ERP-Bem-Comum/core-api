/**
 * DASH-F5 (#242) · borda HTTP: GET /api/v2/financial/dashboard/no-contract-suppliers.
 * Widget "Fornecedores sem Contrato" — Top-5 fornecedores sem contrato por total desc (desempate
 * estável por supplierRef asc). RBAC: reference:read (paridade com recent-payments — #239).
 *
 * Seed: a agregação REP-2 (fin_payable_view ⟕ fin_supplier_view) é servida em produção pelo reader
 * Drizzle boot-scoped. Este teste HTTP injeta um reader in-memory seedado via
 * `FinancialCompositionConfig.suppliersWithoutContractReader` (seam da composição — ver composition.ts)
 * e prova o corte/ordem no caminho memory. O corte AUTORITATIVO no SQL é provado pela suíte de
 * integração Drizzle (`suppliers-without-contract-top.drizzle-mysql.test.ts`).
 * Molde: `recent-payments.http.test.ts`.
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
import { createInMemorySuppliersWithoutContractReader } from '#src/modules/financial/adapters/persistence/repos/suppliers-without-contract-reader.in-memory.ts';
import type { SupplierWithoutContractRow } from '#src/modules/financial/public-api/suppliers-without-contract-projection.ts';

const READER = 'reference:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const sup = (n: number): string => `aa000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// 6 fornecedores sem contrato com totais distintos (mais que o Top-5) — semeados fora de ordem para
// provar que a ordenação é do reader, não do array de entrada. Um deles com name null (nullable).
const SEED: readonly SupplierWithoutContractRow[] = [
  { supplierRef: sup(3), name: 'Gamma', totalCents: 30000, payableCount: 3 },
  { supplierRef: sup(1), name: 'Alpha', totalCents: 50000, payableCount: 5 },
  { supplierRef: sup(6), name: null, totalCents: 5000, payableCount: 1 },
  { supplierRef: sup(2), name: 'Beta', totalCents: 40000, payableCount: 4 },
  { supplierRef: sup(5), name: 'Epsilon', totalCents: 10000, payableCount: 1 },
  { supplierRef: sup(4), name: 'Delta', totalCents: 20000, payableCount: 2 },
];

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
  const reader = createInMemorySuppliersWithoutContractReader(SEED);
  const base = await buildFinancialHttpDeps({
    driver: 'memory',
    suppliersWithoutContractReader: reader,
  });
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

describe('financial/http — GET /dashboard/no-contract-suppliers (#242)', () => {
  it('reference:read → 200 com Top-5 por total desc, corte no 5º (semeados 6)', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/dashboard/no-contract-suppliers',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      suppliers: readonly { supplierRef: string; name: string | null; totalCents: number }[];
    };

    assert.equal(body.suppliers.length, 5, 'Top-5 — deve truncar os 6 semeados');
    // Ordem esperada por total desc: 50000, 40000, 30000, 20000, 10000 (5000 fica de fora — 6º lugar).
    assert.deepEqual(
      body.suppliers.map((s) => s.totalCents),
      [50000, 40000, 30000, 20000, 10000],
    );
    assert.deepEqual(
      body.suppliers.map((s) => s.supplierRef),
      [sup(1), sup(2), sup(3), sup(4), sup(5)],
    );
    // O fornecedor com name null (total 5000) foi o cortado — mas o shape aceita name nullable.
    for (const s of body.suppliers) {
      assert.equal(typeof s.supplierRef, 'string');
      assert.equal(typeof s.totalCents, 'number');
      assert.ok(s.name === null || typeof s.name === 'string');
      // DTO lean — nunca expõe payableCount (linha do REP-2 não pedida pelo widget).
      assert.equal(Object.prototype.hasOwnProperty.call(s, 'payableCount'), false);
    }
  });

  it('shape aceita name null (fornecedor não projetado em fin_supplier_view)', async () => {
    // Reader só com o fornecedor sem nome → prova a serialização de name null no envelope.
    const onlyNull = createInMemorySuppliersWithoutContractReader([
      { supplierRef: sup(6), name: null, totalCents: 5000, payableCount: 1 },
    ]);
    const base = await buildFinancialHttpDeps({
      driver: 'memory',
      suppliersWithoutContractReader: onlyNull,
    });
    const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
    const app = await buildApp({
      config,
      routes: [financialHttpPlugin(base, { requireAuth, authorize })],
    });
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/financial/dashboard/no-contract-suppliers',
        headers: { authorization: `Bearer ${READER}` },
      });
      assert.equal(res.statusCode, 200, res.body);
      assert.deepEqual(res.json(), {
        suppliers: [{ supplierRef: sup(6), name: null, totalCents: 5000 }],
      });
    } finally {
      await app.close();
      await base.shutdown();
    }
  });

  it('sem reference:read → 403', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/dashboard/no-contract-suppliers',
      headers: { authorization: 'Bearer fiscal-document:read' },
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it('sem candidatos → 200 com envelope de suppliers vazio', async () => {
    const empty = createInMemorySuppliersWithoutContractReader();
    const base = await buildFinancialHttpDeps({
      driver: 'memory',
      suppliersWithoutContractReader: empty,
    });
    const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
    const app = await buildApp({
      config,
      routes: [financialHttpPlugin(base, { requireAuth, authorize })],
    });
    try {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v2/financial/dashboard/no-contract-suppliers',
        headers: { authorization: `Bearer ${READER}` },
      });
      assert.equal(res.statusCode, 200, res.body);
      assert.deepEqual(res.json(), { suppliers: [] });
    } finally {
      await app.close();
      await base.shutdown();
    }
  });
});
