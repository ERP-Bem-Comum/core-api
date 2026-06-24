/**
 * #222 — borda HTTP GET /financial/payables (listagem payable-centric: pai + filhos como linhas).
 * Driver memory; auth via hooks FAKE. W0 RED: a rota ainda não existe.
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

const openNfseBody = () => ({
  type: 'NFS-e',
  documentNumber: 'NFS-PAY-1',
  supplierRef: SUP,
  paymentMethod: 'PIX',
  grossValueCents: '1000000',
  sourceDiscountsCents: '0',
  discountsCents: '0',
  penaltyCents: '0',
  interestCents: '0',
  retentions: [{ type: 'ISS', baseCents: '350000', rateBps: 1000, valueCents: '35000' }],
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
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

interface PayableRow {
  kind: string;
  retentionType: string | null;
  documentNumber: string | null;
  status: string;
  valueCents: string;
}

describe('financial/http — GET /financial/payables (#222)', () => {
  it('lista pai + filho (ISS) como linhas pagáveis distintas (200)', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: openNfseBody(),
    });
    assert.equal(created.statusCode, 201, created.body);

    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/payable-titles',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: readonly PayableRow[]; total: number };
    assert.equal(body.total, 2); // pai (líquido) + filho ISS
    assert.ok(body.items.some((i) => i.kind === 'Parent'));
    assert.ok(body.items.some((i) => i.kind === 'Child' && i.retentionType === 'ISS'));
    assert.ok(body.items.every((i) => i.documentNumber === 'NFS-PAY-1'));
  });

  it('filtro status=Paid → vazio (títulos estão Open)', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/payable-titles?status=Paid',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { total: number };
    assert.equal(body.total, 0);
  });

  it('exige fiscal-document:read → 403 sem a permissão', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/payable-titles',
      headers: { authorization: 'Bearer outra:permissao' },
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  // #229: paridade com o grid por documento — issueDate, paymentMethod, version, bruto/líquido + dueDate date-only.
  it('#229: item expõe issueDate, paymentMethod, version, grossValueCents, netValueCents (dueDate date-only)', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: { ...openNfseBody(), documentNumber: 'NFS-229', issueDate: '2026-01-15' },
    });
    assert.equal(created.statusCode, 201, created.body);

    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/payable-titles',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: readonly Record<string, unknown>[] };
    const parent = body.items.find(
      (i) => i['documentNumber'] === 'NFS-229' && i['kind'] === 'Parent',
    );
    assert.ok(parent, 'título pai de NFS-229 presente');
    assert.equal(parent['issueDate'], '2026-01-15');
    assert.equal(parent['paymentMethod'], 'PIX');
    assert.equal(typeof parent['version'], 'number');
    assert.equal(parent['grossValueCents'], '1000000');
    assert.equal(typeof parent['netValueCents'], 'string');
    assert.equal(parent['dueDate'], '2026-12-31'); // date-only, não ISO datetime
  });
});
