/**
 * W0 RED (FIN-DOC-SUBCATEGORY-STAMP · S1 do épico Taxonomia Planejável Unificada, #502) —
 * o CARIMBO da subcategoria no documento financeiro, ponta a ponta na borda HTTP (driver `memory`).
 *
 * Espelha `create-categorization-refs.http.test.ts` (#147): mesmo wiring de auth FAKE, mesmo
 * driver `memory`. A folha da árvore do plano (`subcategoryRef`) passa a ser aceita no create,
 * gravada e ecoada no detalhe — exatamente como `budgetPlanRef`/`categoryRef`/`costCenterRef`.
 *
 * DEVE FALHAR em W0 (pelo motivo certo):
 *  - CA2/CA6: `POST /documents { subcategoryRef }` — hoje o Zod (`createDocumentBodySchema`) NÃO
 *    conhece o campo → `z.object` DESCARTA a chave desconhecida → o use case nunca a vê → o DTO de
 *    resposta não tem `subcategoryRef`. `GET` devolve `undefined`, não o UUID → asserção falha.
 *  - CA4: sem o campo no create, o eco `null` (nasce nulo) também é `undefined` → falha.
 *  - CA5 (borda): `subcategoryRef` malformado é descartado (não validado) → hoje devolve 201, não 400.
 *
 * Este arquivo roda em `pnpm test` puro (sem MySQL) — é UNIT/borda com repositório InMemory.
 * Regressão zero (CA8): NÃO edita nenhuma suíte existente; os fluxos create/get seguem intactos.
 *
 * Código EN, comentários PT-BR.
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

const SUPPLIER = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CATEGORY = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1';
const BUDGET = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';
// A folha da árvore do plano — o carimbo deste ticket.
// W1: o literal original do W0 (`5ubca7e9-...`) tinha um `u` não-hexadecimal → `z.uuid()`/`isUuidV4`
// rejeitavam (400), tornando CA2/CA3 insatisfazíveis. Corrigido para UUID v4 válido (typo de fixture,
// não mudança de contrato — a validação de formato UUID v4 é a regra do ref opaco, CA5/CA7).
const SUBCATEGORY = '5abca7e9-0000-4000-8000-000000000001';

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
  documentNumber: 'NFS-SUBCAT-001',
  supplierRef: SUPPLIER,
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
  budgetPlanRef: BUDGET,
  subcategoryRef: SUBCATEGORY,
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

interface DetailRefs {
  status: string;
  subcategoryRef: string | null;
  budgetPlanRef: string | null;
  categoryRef: string | null;
}

describe('FIN-DOC-SUBCATEGORY-STAMP — carimbo da subcategoria no documento (#502)', () => {
  it('CA2+CA6: create Open com subcategoryRef → GET ecoa subcategoryRef', async () => {
    const createRes = await postDocument(WRITER, nfseBody({ documentNumber: 'NFS-SUBCAT-OPEN' }));
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const getRes = await getDocument(WRITER, docId);
    assert.equal(getRes.statusCode, 200, getRes.body);
    const detail = getRes.json() as DetailRefs;
    assert.equal(detail.subcategoryRef, SUBCATEGORY);
  });

  it('CA3: subcategoryRef e budgetPlanRef convivem no mesmo documento (ambos ecoados)', async () => {
    const createRes = await postDocument(WRITER, nfseBody({ documentNumber: 'NFS-SUBCAT-COEX' }));
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const detail = (await getDocument(WRITER, docId)).json() as DetailRefs;
    assert.equal(detail.subcategoryRef, SUBCATEGORY);
    assert.equal(detail.budgetPlanRef, BUDGET);
    assert.equal(detail.categoryRef, CATEGORY);
  });

  it('CA2: create Draft com subcategoryRef → GET ecoa subcategoryRef', async () => {
    const createRes = await postDocument(
      WRITER,
      nfseBody({ asDraft: true, dueDate: undefined, documentNumber: 'NFS-SUBCAT-DRAFT' }),
    );
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const detail = (await getDocument(WRITER, docId)).json() as DetailRefs;
    assert.equal(detail.status, 'Draft');
    assert.equal(detail.subcategoryRef, SUBCATEGORY);
  });

  it('CA4: subcategoryRef opcional — documento sem ele nasce nulo (back-compat)', async () => {
    const createRes = await postDocument(
      WRITER,
      nfseBody({ documentNumber: 'NFS-SUBCAT-NONE', subcategoryRef: undefined }),
    );
    assert.equal(createRes.statusCode, 201, createRes.body);
    const docId = (createRes.json() as { id: string }).id;

    const detail = (await getDocument(WRITER, docId)).json() as DetailRefs;
    assert.equal(detail.subcategoryRef, null);
  });

  it('CA5 (borda): subcategoryRef malformado → 400 (rejeitado no Zod, não chega ao domínio)', async () => {
    const res = await postDocument(
      WRITER,
      nfseBody({ documentNumber: 'NFS-SUBCAT-BAD', subcategoryRef: 'not-a-uuid' }),
    );
    assert.equal(res.statusCode, 400, res.body);
  });
});
