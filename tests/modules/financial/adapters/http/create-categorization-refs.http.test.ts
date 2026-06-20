/**
 * FIN-CREATE-CATEG-LISTINGS (#147) — refs de categorização editável no create + detail.
 *
 * O front da tela "Lançar Documento" edita a categorização do documento (Categoria, Centro de
 * custo, Programa, Plano Orçamentário, Contrato). Esta suíte cobre:
 *  - CA1: `POST /documents` aceita e persiste `costCenterRef` (Open e Draft).
 *  - CA2: `GET /documents/:id` ecoa `costCenterRef` + demais refs de categorização (round-trip).
 *  - CA1.err: `costCenterRef` malformado → 400 na borda (Zod), sem chegar ao domínio.
 *
 * Driver memory + hooks de auth FAKE (espelha financial-documents.http.test.ts).
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

const WRITER = 'fiscal-document:write,fiscal-document:read,fiscal-document:cancel';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const CATEGORY = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1';
const COST_CENTER = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PROGRAM = '7b000000-0000-4000-8000-000000000001';
const BUDGET = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';

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

const nfseBody = (overrides: Record<string, unknown> = {}) => ({
  type: 'NFS-e',
  documentNumber: 'NFS-CAT-001',
  supplierRef: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  paymentMethod: 'PIX',
  grossValueCents: '100000',
  sourceDiscountsCents: '0',
  discountsCents: '0',
  penaltyCents: '0',
  interestCents: '0',
  retentions: [],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
  categoryRef: CATEGORY,
  costCenterRef: COST_CENTER,
  programRef: PROGRAM,
  budgetPlanRef: BUDGET,
  ...overrides,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}

let handle: AppHandle;

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

const bearer = (perms: string) => ({ authorization: `Bearer ${perms}` });

const postDocument = (perms: string, body: Record<string, unknown>) =>
  handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: bearer(perms),
    payload: body,
  });

const getDocument = (perms: string, id: string) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents/${id}`,
    headers: bearer(perms),
  });

describe('FIN-CREATE-CATEG-LISTINGS — refs de categorização (#147)', () => {
  it('CA1+CA2: create Open com costCenterRef → GET ecoa todos os refs de categorização', async () => {
    const createRes = await postDocument(WRITER, nfseBody());
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const getRes = await getDocument(WRITER, docId);
    assert.equal(getRes.statusCode, 200, getRes.body);
    const detail = getRes.json() as {
      categoryRef: string | null;
      costCenterRef: string | null;
      programRef: string | null;
      budgetPlanRef: string | null;
    };
    assert.equal(detail.categoryRef, CATEGORY);
    assert.equal(detail.costCenterRef, COST_CENTER);
    assert.equal(detail.programRef, PROGRAM);
    assert.equal(detail.budgetPlanRef, BUDGET);
  });

  it('CA1: create Draft com costCenterRef → GET ecoa costCenterRef', async () => {
    const createRes = await postDocument(
      WRITER,
      nfseBody({ asDraft: true, dueDate: undefined, documentNumber: 'NFS-CAT-DRAFT' }),
    );
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const getRes = await getDocument(WRITER, docId);
    assert.equal(getRes.statusCode, 200, getRes.body);
    const detail = getRes.json() as { status: string; costCenterRef: string | null };
    assert.equal(detail.status, 'Draft');
    assert.equal(detail.costCenterRef, COST_CENTER);
  });

  it('CA1.err: costCenterRef malformado → 400 (rejeitado na borda)', async () => {
    const res = await postDocument(WRITER, nfseBody({ costCenterRef: 'not-a-uuid' }));
    assert.equal(res.statusCode, 400, res.body);
  });
});
