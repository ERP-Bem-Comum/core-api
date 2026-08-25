/**
 * FIN-PAYABLE-COUNTS — W0 (RED) — #536: contagem agregada por status num endpoint só.
 *
 * O grid de Contas a Pagar conta por chip disparando ~6 queries (pageSize=1 só p/ o `total`).
 * `GET /financial/payable-titles/counts` troca por 1: `{ total, draft, byStatus }`. RED por 404
 * (rota inexistente). Cobre CA1 (total/byStatus), CA2 (draft), CA3 (filtro), CA4 (gate).
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
const PLAIN = 'none';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

const SUP_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SUP_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

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

const openBody = (overrides: Record<string, unknown> = {}) => ({
  type: 'NFS-e',
  documentNumber: 'DOC-001',
  supplierRef: SUP_A,
  paymentMethod: 'PIX',
  grossValueCents: '100000',
  retentions: [], // sem retenção → 1 título (pai) só
  registeredTaxes: [],
  dueDate: '2026-12-31',
  asDraft: false,
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

  // Seed: 2 títulos Open (fornecedores distintos) + 1 rascunho (SUP_A).
  const post = (body: Record<string, unknown>) =>
    handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: body,
    });
  await post(openBody({ documentNumber: 'OPEN-A', supplierRef: SUP_A }));
  await post(openBody({ documentNumber: 'OPEN-B', supplierRef: SUP_B }));
  await post(
    openBody({ documentNumber: 'DRAFT-A', supplierRef: SUP_A, asDraft: true, dueDate: undefined }),
  );
});

after(async () => {
  await handle.teardown();
});

interface Counts {
  total: number;
  draft: number;
  byStatus: Record<string, number>;
}

const getCounts = (query: string, perms = WRITER) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/payable-titles/counts${query}`,
    headers: { authorization: `Bearer ${perms}` },
  });

describe('FIN-PAYABLE-COUNTS — GET /payable-titles/counts (#536)', () => {
  it('CA1 — sem filtro: total = nº de títulos; byStatus soma para total', async () => {
    const res = await getCounts('');
    assert.equal(res.statusCode, 200, res.body);
    const c = res.json() as Counts;
    assert.equal(c.total, 2);
    assert.equal(c.byStatus['Open'], 2);
    const sum = Object.values(c.byStatus).reduce((a, b) => a + b, 0);
    assert.equal(sum, c.total);
  });

  it('CA2 — draft conta documentos Draft à parte dos títulos', async () => {
    const c = (await getCounts('')).json() as Counts;
    assert.equal(c.draft, 1);
  });

  it('CA3 — filtro supplierRef recorta total/byStatus e draft', async () => {
    const c = (await getCounts(`?supplierRef=${SUP_A}`)).json() as Counts;
    assert.equal(c.total, 1);
    assert.equal(c.byStatus['Open'], 1);
    assert.equal(c.draft, 1); // o rascunho é do SUP_A
  });

  it('CA4 — gate: 401 sem token, 403 sem fiscal-document:read', async () => {
    const noToken = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/payable-titles/counts',
    });
    assert.equal(noToken.statusCode, 401);
    const noPerm = await getCounts('', PLAIN);
    assert.equal(noPerm.statusCode, 403);
  });
});
