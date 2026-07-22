/**
 * W0 RED — REPORTS-SUPPLIERS-NO-ACTIVE-CONTRACT (#437). Borda
 * GET /api/v2/reports/suppliers-without-contract com o wiring NOVO: a rota passa a servir o
 * anti-join (candidatos do `financial` − contratantes com contrato `Active` do `contracts`).
 *
 * Arquivo separado de `suppliers-without-contract.http.test.ts` (REP-2 · #240) de propósito: aquele
 * fica intacto e VERDE, provando que o contrato HTTP não mudou (CA4 — front não muda). Este cobre
 * a semântica nova ponta-a-ponta, com in-memory dos dois lados (fakes, nunca mocks) — sem MySQL.
 *
 * W0 RED: `listSuppliersWithoutActiveContract` / `InMemoryActiveContractorRead` ainda não existem.
 *
 * CA1 — fornecedor com contrato Active não sai na resposta, mesmo com títulos sem contract_ref.
 * CA2 — fornecedor sem contrato Active (só Pending / nenhum) sai.
 * CA4 — sem `fiscal-document:read` → 403; com → 200; corpo `{ suppliers: [{ supplierRef, name,
 *       totalCents, payableCount }] }` inalterado.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { err } from '#src/shared/primitives/result.ts';
import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { buildReportsHttpDeps, reportsHttpPlugin } from '#src/modules/reports/public-api/http.ts';
import { listSuppliersWithoutActiveContract } from '#src/modules/reports/application/use-cases/list-suppliers-without-active-contract.ts';
import { InMemorySuppliersWithoutContractRead } from '#src/modules/reports/adapters/persistence/suppliers-without-contract-read.in-memory.ts';
import { InMemoryActiveContractorRead } from '#src/modules/reports/adapters/persistence/active-contractor-read.in-memory.ts';
import type { SupplierWithoutContract } from '#src/modules/reports/application/ports/suppliers-without-contract-read.ts';
import type { ActiveContractorReadPort } from '#src/modules/reports/application/ports/active-contractor-read.ts';

const READER = 'fiscal-document:read';
const NO_PERM = 'reconciliation:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const S_WITH_ACTIVE = '11111111-1111-4111-8111-111111111111';
const S_ONLY_PENDING = '22222222-2222-4222-8222-222222222222';

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

const candidate = (over: Partial<SupplierWithoutContract> = {}): SupplierWithoutContract => ({
  supplierRef: S_ONLY_PENDING,
  name: 'Fornecedor Alpha',
  totalCents: 150000,
  payableCount: 2,
  ...over,
});

type App = Awaited<ReturnType<typeof buildApp>>;

const buildAppWith = async (
  listSuppliersWithoutContract: () => Promise<
    Awaited<ReturnType<ReturnType<typeof listSuppliersWithoutActiveContract>>>
  >,
): Promise<App> => {
  const base = await buildReportsHttpDeps({ driver: 'memory' });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  return buildApp({
    config,
    routes: [
      reportsHttpPlugin({ ...base, listSuppliersWithoutContract }, { requireAuth, authorize }),
    ],
  });
};

const get = (app: App, perm: string): Promise<LightMyRequestResponse> =>
  app.inject({
    method: 'GET',
    url: '/api/v2/reports/suppliers-without-contract',
    headers: { authorization: `Bearer ${perm}` },
  });

describe('reports/http — GET /reports/suppliers-without-contract com anti-join (#437)', () => {
  let app: App;

  before(async () => {
    // S_WITH_ACTIVE: candidato no financial (tem título sem contract_ref) MAS tem contrato Active.
    // S_ONLY_PENDING: candidato e sem contrato Active → único que deve sair.
    app = await buildAppWith(
      listSuppliersWithoutActiveContract({
        suppliersRead: InMemorySuppliersWithoutContractRead([
          candidate({ supplierRef: S_WITH_ACTIVE, name: 'Tem Contrato Ltda', totalCents: 999 }),
          candidate({ supplierRef: S_ONLY_PENDING }),
        ]),
        activeContractorsRead: InMemoryActiveContractorRead([S_WITH_ACTIVE]),
      }),
    );
  });

  after(async () => {
    await app?.close();
  });

  it('CA1+CA2: 200 servindo só quem não tem contrato Active', async () => {
    const res = await get(app, READER);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { suppliers: SupplierWithoutContract[] };
    assert.deepEqual(
      body.suppliers.map((s) => s.supplierRef),
      [S_ONLY_PENDING],
      'fornecedor com contrato Active não pode aparecer (bug do REP-2)',
    );
  });

  it('CA4: contrato HTTP inalterado — 4 colunas por item', async () => {
    const res = await get(app, READER);
    const body = res.json() as { suppliers: Record<string, unknown>[] };
    assert.deepEqual(
      [...Object.keys(body.suppliers[0]!)].sort(),
      ['name', 'payableCount', 'supplierRef', 'totalCents'].sort(),
    );
  });

  it('CA4: RBAC — sem fiscal-document:read → 403', async () => {
    const res = await get(app, NO_PERM);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('CA4: RBAC — com fiscal-document:read → 200', async () => {
    const res = await get(app, READER);
    assert.equal(res.statusCode, 200, res.body);
  });

  it('fail-closed: contracts indisponível → 503 (não 200 com lista não-subtraída)', async () => {
    const brokenContractors: ActiveContractorReadPort = {
      listContractorsWithActiveContract: () =>
        Promise.resolve(err('active-contractor-read-unavailable')),
    };
    const degraded = await buildAppWith(
      listSuppliersWithoutActiveContract({
        suppliersRead: InMemorySuppliersWithoutContractRead([
          candidate({ supplierRef: S_WITH_ACTIVE }),
        ]),
        activeContractorsRead: brokenContractors,
      }),
    );

    const res = await get(degraded, READER);
    await degraded.close();

    assert.equal(res.statusCode, 503, res.body);
  });
});
