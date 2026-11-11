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

// Filtro pela data de EMISSÃO (`issuedFrom`/`issuedTo`). Fornecedor próprio isola a massa dos casos
// acima (mesmo app/driver memory). Massa:
//   ISS-EARLY — emitido 2026-03-10, vence 2026-07-01, ISS → 2 títulos (pai + filho)
//   ISS-LATE  — emitido 2026-05-20, vence 2026-08-01, sem retenção → 1 título
//   ISS-NONE  — sem emissão, vence 2026-07-01, sem retenção → 1 título
const SUP_ISSUED = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

describe('financial/http — GET /payable-titles — filtro por emissão (issuedFrom/issuedTo)', () => {
  before(async () => {
    const post = async (overrides: Record<string, unknown>) => {
      const res = await handle.app.inject({
        method: 'POST',
        url: '/api/v2/financial/documents',
        headers: { authorization: `Bearer ${TOKEN}` },
        payload: { ...openNfseBody(), supplierRef: SUP_ISSUED, ...overrides },
      });
      assert.equal(res.statusCode, 201, res.body);
    };
    await post({ documentNumber: 'ISS-EARLY', issueDate: '2026-03-10', dueDate: '2026-07-01' });
    await post({
      documentNumber: 'ISS-LATE',
      issueDate: '2026-05-20',
      dueDate: '2026-08-01',
      retentions: [],
    });
    await post({ documentNumber: 'ISS-NONE', dueDate: '2026-07-01', retentions: [] });
  });

  const list = async (query: string) => {
    const res = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/payable-titles?supplierRef=${SUP_ISSUED}${query}`,
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    return res;
  };
  const docs = (body: { items: readonly PayableRow[] }): string[] =>
    [...new Set(body.items.map((i) => i.documentNumber ?? '∅'))].sort();

  it('sem filtro de emissão: o documento sem issueDate continua na lista', async () => {
    const res = await list('');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: readonly PayableRow[]; total: number };
    assert.equal(body.total, 4);
    assert.deepEqual(docs(body), ['ISS-EARLY', 'ISS-LATE', 'ISS-NONE']);
  });

  it('só issuedFrom → issue_date >= issuedFrom', async () => {
    const res = await list('&issuedFrom=2026-04-01');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: readonly PayableRow[]; total: number };
    assert.equal(body.total, 1);
    assert.deepEqual(docs(body), ['ISS-LATE']);
  });

  it('só issuedTo → issue_date <= issuedTo; o filho ISS herda a emissão do documento', async () => {
    const res = await list('&issuedTo=2026-04-01');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: readonly PayableRow[]; total: number };
    assert.equal(body.total, 2);
    assert.deepEqual(docs(body), ['ISS-EARLY']);
    assert.ok(body.items.some((i) => i.kind === 'Child' && i.retentionType === 'ISS'));
  });

  it('ambos → intervalo inclusivo nos dois extremos; sem emissão fica de fora', async () => {
    const res = await list('&issuedFrom=2026-03-10&issuedTo=2026-05-20');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: readonly PayableRow[]; total: number };
    assert.equal(body.total, 3);
    assert.deepEqual(docs(body), ['ISS-EARLY', 'ISS-LATE']);
  });

  it('issuedFrom posterior a issuedTo → 200 com lista vazia (borda não valida a ordem, como dueFrom/dueTo)', async () => {
    const res = await list('&issuedFrom=2026-06-01&issuedTo=2026-01-01');
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { total: number };
    assert.equal(body.total, 0);
  });

  it('issuedFrom em formato inválido → 400 (mesmo contrato de data de dueFrom)', async () => {
    const res = await list('&issuedFrom=2026-13-45');
    assert.equal(res.statusCode, 400, res.body);
    const resTo = await list('&issuedTo=ontem');
    assert.equal(resTo.statusCode, 400, resTo.body);
  });

  it('combina em AND com dueFrom/dueTo e status', async () => {
    // ISS-LATE passa na emissão mas vence fora; ISS-EARLY vence dentro mas foi emitido antes.
    const res = await list('&issuedFrom=2026-04-01&dueFrom=2026-06-01&dueTo=2026-07-15');
    assert.equal(res.statusCode, 200, res.body);
    assert.equal((res.json() as { total: number }).total, 0);

    const paid = await list('&issuedTo=2026-04-01&status=Paid');
    assert.equal(paid.statusCode, 200, paid.body);
    assert.equal((paid.json() as { total: number }).total, 0);
  });
});
