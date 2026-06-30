/**
 * FIN-DOC-PAYMENT-DETAIL-PATCH (CA6 / US2 da #273) — W0 RED da borda HTTP.
 *
 * Cobre o PATCH /api/v2/financial/documents/:id com `paymentDetail`:
 *   - CA6.1: novo valor válido → 200; GET /:id retorna novo valor.
 *   - CA6.2: paymentDetail: null → 200; GET retorna null (apagado).
 *   - CA6.3: PATCH sem a chave paymentDetail (mas com outro campo) → campo preservado.
 *   - CA6.4: inválido (vazio/só-espaços/controle/>255) → 400 (parametrizado).
 *   - CA6.5: GET /:id/timeline registra before/after do campo após edição.
 *
 * Nota CA6.3: testa preservação quando ausente — pode já passar em W0 (comportamento
 * existe); os RED críticos são CA6.1/CA6.2/CA6.4/CA6.5 (a borda PATCH não conhece
 * o campo ainda, então CA6.1/CA6.2 retornam 400 e CA6.4/CA6.5 falham).
 *
 * Driver: memory; auth via hooks FAKE (espelha document-payment-detail.routes.test.ts).
 * Optimistic lock: PATCH exige `version`; documento recém-criado começa em version=0.
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
  documentNumber: 'NFS-PATCH-273',
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

const patch = (id: string, body: Record<string, unknown>) =>
  handle.app.inject({
    method: 'PATCH',
    url: `/api/v2/financial/documents/${id}`,
    headers: { authorization: `Bearer ${TOKEN}` },
    payload: body,
  });

const getDetail = (id: string) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents/${id}`,
    headers: { authorization: `Bearer ${TOKEN}` },
  });

const getTimeline = (id: string) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/documents/${id}/timeline`,
    headers: { authorization: `Bearer ${TOKEN}` },
  });

// ─── Helper: cria documento com paymentDetail e retorna id + version ──────────

const createWithDetail = async (detail: string, docNumber = 'NFS-PATCH-273') => {
  const res = await post(nfseBody({ documentNumber: docNumber, paymentDetail: detail }));
  assert.equal(res.statusCode, 201, `create falhou: ${res.body}`);
  const body = res.json() as { id: string; version: number };
  return { id: body.id, version: body.version };
};

describe('financial/http — PATCH paymentDetail (CA6 / #273 / feature 027)', () => {
  it('CA6.1: PATCH com novo paymentDetail válido → 200; GET retorna novo valor', async () => {
    const original = '34191.79001 01043.510047 91020.150008 9 12345678901234';
    const updated = '34191.79001 01043.510047 91020.150008 9 99999999999999';

    const { id, version } = await createWithDetail(original, 'NFS-CA61');
    const patchRes = await patch(id, { version, paymentDetail: updated });
    assert.equal(patchRes.statusCode, 200, `PATCH falhou: ${patchRes.body}`);

    const detailRes = await getDetail(id);
    assert.equal(detailRes.statusCode, 200, detailRes.body);
    assert.equal((detailRes.json() as { paymentDetail: string | null }).paymentDetail, updated);
  });

  it('CA6.2: PATCH com paymentDetail: null → 200; GET retorna null (campo apagado)', async () => {
    const original = '34191.79001 01043.510047 91020.150008 9 12345678901234';

    const { id, version } = await createWithDetail(original, 'NFS-CA62');
    const patchRes = await patch(id, { version, paymentDetail: null });
    assert.equal(patchRes.statusCode, 200, `PATCH falhou: ${patchRes.body}`);

    const detailRes = await getDetail(id);
    assert.equal(detailRes.statusCode, 200, detailRes.body);
    assert.equal((detailRes.json() as { paymentDetail: string | null }).paymentDetail, null);
  });

  it('CA6.3: PATCH sem a chave paymentDetail (só description) → campo preservado', async () => {
    const original = '34191.79001 01043.510047 91020.150008 9 12345678901234';

    const { id, version } = await createWithDetail(original, 'NFS-CA63');
    // Envia PATCH com description mas SEM paymentDetail
    const patchRes = await patch(id, { version, description: 'nova descrição' });
    assert.equal(patchRes.statusCode, 200, `PATCH falhou: ${patchRes.body}`);

    const detailRes = await getDetail(id);
    assert.equal(detailRes.statusCode, 200, detailRes.body);
    // paymentDetail deve permanecer com o valor original
    assert.equal((detailRes.json() as { paymentDetail: string | null }).paymentDetail, original);
  });

  // CA6.4: valores inválidos de paymentDetail no PATCH → 400.
  // Usa `description` como campo válido adicional para distinguir do erro "pelo menos um campo"
  // que ocorreria antes da implementação (sem `paymentDetail` no schema, Zod strips o campo
  // e o body ficaria só com `version` → refine falha → 400 por motivo errado).
  // Com `description` presente, o refine passa e o 400 vem da validação do paymentDetail.
  const invalidCases: readonly (readonly [string, unknown])[] = [
    ['vazio', ''],
    ['só-espaços', '   '],
    ['quebra de linha (\\n)', 'linha\ndigitavel'],
    ['retorno de carro (\\r)', 'linha\rdigitavel'],
    ['caractere NUL (\\x00)', 'linha\x00digitavel'],
    ['acima de 255 chars', 'x'.repeat(256)],
  ];

  for (const [label, value] of invalidCases) {
    it(`CA6.4: paymentDetail inválido (${label}) no PATCH → 400`, async () => {
      // Cria um documento fresh para cada caso inválido (garante version=0 limpo)
      const created = await post(nfseBody({ documentNumber: `NFS-CA64-${label.slice(0, 8)}` }));
      assert.equal(created.statusCode, 201, created.body);
      const { id, version } = created.json() as { id: string; version: number };

      // Inclui description para que o refine "pelo menos um campo" passe e o 400 venha
      // exclusivamente da validação de paymentDetail (cobertura correta após implementação).
      const res = await patch(id, { version, description: 'ancora', paymentDetail: value });
      assert.equal(res.statusCode, 400, `esperava 400 para "${label}", recebeu: ${res.body}`);
    });
  }

  it('CA6.5: GET /:id/timeline registra before/after do paymentDetail após edição', async () => {
    const beforeVal = '34191.79001 01043.510047 91020.150008 9 11111111111111';
    const afterVal = '34191.79001 01043.510047 91020.150008 9 22222222222222';

    const { id, version } = await createWithDetail(beforeVal, 'NFS-CA65');
    const patchRes = await patch(id, { version, paymentDetail: afterVal });
    assert.equal(patchRes.statusCode, 200, `PATCH falhou: ${patchRes.body}`);

    const timelineRes = await getTimeline(id);
    assert.equal(timelineRes.statusCode, 200, timelineRes.body);

    interface Change {
      field: string;
      before: string | null;
      after: string | null;
    }
    interface Entry {
      eventType: string;
      target: { kind: string };
      changes: readonly Change[];
    }
    const { entries } = timelineRes.json() as { entries: readonly Entry[] };

    // Deve haver ao menos uma entry de documento
    const docEntries = entries.filter((e) => e.target.kind === 'Document');
    assert.ok(docEntries.length > 0, 'esperava ao menos uma entry de Document na trilha');

    // O timeline tem duas entradas com paymentDetail:
    //   1. criação: before=null → after=original (a criação já capta a entrada do campo)
    //   2. PATCH: before=original → after=novo valor (é a que CA6.5 valida)
    // Filtra pela entrada cujo `after` é o valor inserido via PATCH (não a criação).
    const allChanges = docEntries.flatMap((e) => e.changes);
    const patchChange = allChanges.find((c) => c.field === 'paymentDetail' && c.after === afterVal);
    assert.ok(
      patchChange !== undefined,
      `entrada de PATCH para "paymentDetail" não encontrada na trilha. Changes: ${JSON.stringify(allChanges)}`,
    );
    assert.equal(
      patchChange.before,
      beforeVal,
      'before deve ser o valor original (antes do PATCH)',
    );
    assert.equal(patchChange.after, afterVal, 'after deve ser o novo valor (após o PATCH)');
  });
});
