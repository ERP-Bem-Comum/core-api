/**
 * W0 RED — FIN-PAYABLE-DUEDATE-ISOLATED (#270). Borda HTTP:
 *   PATCH /financial/documents/:id/payables/:payableId { dueDate, version }
 * altera o vencimento de UM título isolado (sem propagar pai↔filhos). Driver memory; auth FAKE.
 * Rota inexistente → RED (happy/RBAC/validação recebem 404; CA3 ancora no envelope de domínio).
 *
 * CA1: altera só aquele título (verificado via GET /payable-titles + GET /documents/:id).
 * CA2: dueDate inválido → 400. CA3: documento/título inexistente → 404 (envelope `error.code`).
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

const WRITER = 'fiscal-document:write,fiscal-document:read';
const READER = 'fiscal-document:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const SUP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MISSING_UUID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const ORIGINAL_DUE = '2026-12-31';
const NEW_DUE = '2027-03-15';

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

const openNfseBody = () => ({
  type: 'NFS-e',
  documentNumber: 'NFS-DUE-270',
  supplierRef: SUP,
  paymentMethod: 'PIX',
  grossValueCents: '1000000',
  sourceDiscountsCents: '0',
  discountsCents: '0',
  penaltyCents: '0',
  interestCents: '0',
  retentions: [
    { type: 'ISS', baseCents: '350000', rateBps: 1000, valueCents: '35000' },
    { type: 'IRRF', baseCents: '150000', rateBps: 1000, valueCents: '15000' },
  ],
  registeredTaxes: [],
  dueDate: ORIGINAL_DUE,
  asDraft: false,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

const bearer = (perms: string) => ({ authorization: `Bearer ${perms}` });

before(async () => {
  const financialDeps = await buildFinancialHttpDeps({ driver: 'memory' });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(financialDeps, { requireAuth, authorize })],
  });
  handle = {
    app,
    teardown: async () => {
      await app.close();
      await financialDeps.shutdown();
    },
  };
});

after(async () => {
  await handle.teardown();
});

interface TitleRow {
  payableId: string;
  documentId: string;
  kind: string;
  dueDate: string;
}

const titlesOf = async (documentId: string): Promise<TitleRow[]> => {
  const res = await handle.app.inject({
    method: 'GET',
    url: '/api/v2/financial/payable-titles',
    headers: bearer(READER),
  });
  assert.equal(res.statusCode, 200, res.body);
  const items = (res.json() as { items: TitleRow[] }).items;
  return items.filter((i) => i.documentId === documentId);
};

// Cria doc Open (→ título-pai + 2 filhos). Retorna id + linhas de título (com dueDate inicial).
const seedDoc = async (): Promise<{ id: string; parent: TitleRow; children: TitleRow[] }> => {
  const created = await handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: bearer(WRITER),
    payload: openNfseBody(),
  });
  assert.equal(created.statusCode, 201, created.body);
  const id = (created.json() as { id: string }).id;
  const rows = await titlesOf(id);
  const parent = rows.find((r) => r.kind === 'Parent');
  const children = rows.filter((r) => r.kind === 'Child');
  assert.ok(parent, 'título-pai semeado');
  assert.ok(children.length >= 2, 'dois filhos semeados');
  return { id, parent, children };
};

const patchDue = (
  documentId: string,
  payableId: string,
  payload: Record<string, unknown>,
  perms: string | null = WRITER,
) =>
  handle.app.inject({
    method: 'PATCH',
    url: `/api/v2/financial/documents/${documentId}/payables/${payableId}`,
    ...(perms !== null ? { headers: bearer(perms) } : {}),
    payload,
  });

describe('financial/http — PATCH due-date isolado (#270)', () => {
  it('CA1: altera só o título alvo; título-pai, irmão e documento inalterados', async () => {
    const { id, parent, children } = await seedDoc();
    const target = children[0]!;
    const sibling = children[1]!;

    const res = await patchDue(id, target.payableId, { dueDate: NEW_DUE, version: 0 });
    assert.equal(res.statusCode, 200, res.body);

    const rows = await titlesOf(id);
    const reTarget = rows.find((r) => r.payableId === target.payableId)!;
    const reSibling = rows.find((r) => r.payableId === sibling.payableId)!;
    const reParent = rows.find((r) => r.payableId === parent.payableId)!;
    assert.equal(reTarget.dueDate, NEW_DUE, 'alvo mudou');
    assert.equal(reSibling.dueDate, ORIGINAL_DUE, 'irmão inalterado');
    assert.equal(reParent.dueDate, ORIGINAL_DUE, 'título-pai inalterado');

    // Documento-pai não propaga.
    const doc = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/documents/${id}`,
      headers: bearer(READER),
    });
    assert.equal(doc.statusCode, 200, doc.body);
    assert.equal((doc.json() as { dueDate: string }).dueDate, ORIGINAL_DUE, 'documento inalterado');
  });

  it('CA-RBAC: sem Authorization → 401', async () => {
    const { id, children } = await seedDoc();
    const res = await patchDue(id, children[0]!.payableId, { dueDate: NEW_DUE, version: 0 }, null);
    assert.equal(res.statusCode, 401, res.body);
  });

  it('CA-RBAC: token sem fiscal-document:write → 403', async () => {
    const { id, children } = await seedDoc();
    const res = await patchDue(
      id,
      children[0]!.payableId,
      { dueDate: NEW_DUE, version: 0 },
      READER,
    );
    assert.equal(res.statusCode, 403, res.body);
  });

  it('CA2: dueDate mal-formado → 400', async () => {
    const { id, children } = await seedDoc();
    const res = await patchDue(id, children[0]!.payableId, { dueDate: '31-12-2026', version: 0 });
    assert.equal(res.statusCode, 400, res.body);
  });

  // O notFound handler do app também devolve { error.code: 'not-found', message: 'Route not found' };
  // por isso o CA3 ancora na MENSAGEM de domínio (toPublicMessage), distinguindo rota-ausente do
  // not-found de negócio — senão o teste passaria trivialmente sem a rota montada.
  it('CA3: documento inexistente → 404 not-found de domínio (não rota-ausente)', async () => {
    const res = await patchDue(MISSING_UUID, MISSING_UUID, { dueDate: NEW_DUE, version: 0 });
    assert.equal(res.statusCode, 404, res.body);
    const body = res.json() as { error?: { code?: string; message?: string } };
    assert.equal(body.error?.code, 'not-found');
    assert.equal(body.error?.message, 'Documento não encontrado.');
  });

  it('CA3: título inexistente no documento → 404 payable-not-found de domínio', async () => {
    const { id } = await seedDoc();
    const res = await patchDue(id, MISSING_UUID, { dueDate: NEW_DUE, version: 0 });
    assert.equal(res.statusCode, 404, res.body);
    const body = res.json() as { error?: { code?: string; message?: string } };
    assert.equal(body.error?.code, 'not-found');
    assert.equal(body.error?.message, 'Um ou mais títulos informados não foram encontrados.');
  });
});
