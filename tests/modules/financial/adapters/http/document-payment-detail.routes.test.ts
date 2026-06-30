/**
 * FIN-DOC-PAYMENT-DETAIL (feature 027 / #273) — W0 RED da borda HTTP.
 *
 * `paymentDetail` (complemento da forma de pagamento — texto livre opaco) no create + detalhe:
 *   - CA1: POST com valor válido → 201 e GET /:id retorna idêntico.
 *   - CA2: POST sem o campo → 201 e GET /:id traz `paymentDetail: null` (back-compat).
 *   - CA3: vazio / só-espaços / com controle (\n,\r,\x00) / >255 chars → 400 (não persiste).
 *   - CA5: GET /documents (listagem) NÃO contém a chave `paymentDetail` (detail-only — BE-030).
 *
 * NÃO cobre o PATCH/CA6 (fase US2 separada — contracts/http-payment-detail.md §2).
 *
 * RED esperado: `createDocumentBodySchema` é `z.object` puro (strip de chaves desconhecidas) e o
 * `documentResponseSchema`/DTO ainda não expõem `paymentDetail`. Portanto hoje:
 *   - CA1/CA2: o create devolve 201, mas o GET /:id NÃO ecoa `paymentDetail` → asserção falha.
 *   - CA3: o campo é silenciosamente descartado → create devolve 201 (não 400) → asserção falha.
 * Driver memory; auth via hooks FAKE (espelha accesskey.http.test.ts — sem rate-limit).
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

const TOKEN = 'fiscal-document:write,fiscal-document:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const SUP = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

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

const nfseBody = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  type: 'NFS-e',
  documentNumber: 'NFS-273',
  supplierRef: SUP,
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
  ...over,
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

const post = (body: Record<string, unknown>) =>
  handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/documents',
    headers: { authorization: `Bearer ${TOKEN}` },
    payload: body,
  });
const getDetail = (id: string) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents/${id}`,
    headers: { authorization: `Bearer ${TOKEN}` },
  });

describe('financial/http — complemento da forma de pagamento (#273 / feature 027)', () => {
  it('CA1: POST com paymentDetail válido → 201 e GET /:id retorna idêntico', async () => {
    const detail = '34191.79001 01043.510047 91020.150008 9 12345678901234';
    const created = await post(nfseBody({ paymentDetail: detail }));
    assert.equal(created.statusCode, 201, created.body);
    const id = (created.json() as { id: string }).id;

    const detailRes = await getDetail(id);
    assert.equal(detailRes.statusCode, 200, detailRes.body);
    assert.equal((detailRes.json() as { paymentDetail: string | null }).paymentDetail, detail);
  });

  it('CA2: POST sem paymentDetail → 201 e GET /:id traz paymentDetail null', async () => {
    const created = await post(nfseBody());
    assert.equal(created.statusCode, 201, created.body);
    const id = (created.json() as { id: string }).id;

    const detailRes = await getDetail(id);
    assert.equal(detailRes.statusCode, 200, detailRes.body);
    assert.equal((detailRes.json() as { paymentDetail: string | null }).paymentDetail, null);
  });

  // CA3: entradas inválidas → 400 (Zod na borda; não chega ao domínio nem persiste).
  const invalidCases: readonly (readonly [string, unknown])[] = [
    ['vazio', ''],
    ['só-espaços', '   '],
    ['quebra de linha (\\n)', 'linha\ndigitavel'],
    ['retorno de carro (\\r)', 'linha\rdigitavel'],
    ['caractere NUL (\\x00)', 'linha\x00digitavel'],
    ['acima de 255 chars', 'x'.repeat(256)],
  ];
  for (const [label, value] of invalidCases) {
    it(`CA3: paymentDetail inválido (${label}) → 400`, async () => {
      const res = await post(nfseBody({ paymentDetail: value }));
      assert.equal(res.statusCode, 400, res.body);
    });
  }

  it('CA5: GET /documents (listagem) NÃO contém a chave paymentDetail', async () => {
    const detail = '34191.79001 01043.510047 91020.150008 9 99999999999999';
    const created = await post(nfseBody({ documentNumber: 'NFS-273-LIST', paymentDetail: detail }));
    assert.equal(created.statusCode, 201, created.body);

    const listRes = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/documents',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(listRes.statusCode, 200, listRes.body);
    const body = listRes.json() as { items: readonly Record<string, unknown>[] };
    assert.ok(body.items.length >= 1, 'a listagem deve trazer ao menos o documento criado');
    for (const item of body.items) {
      assert.equal(
        Object.prototype.hasOwnProperty.call(item, 'paymentDetail'),
        false,
        'item da listagem não deve expor paymentDetail (detail-only)',
      );
    }
  });
});
