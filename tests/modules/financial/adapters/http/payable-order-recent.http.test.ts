/**
 * FIN-PAYABLE-ORDER-RECENT — W0 (RED) — #263: título recém-lançado no topo da pág. 1.
 *
 * `GET /payable-titles` ordenava por `dueDate asc`. A P.O. quer o lançamento mais recente no topo
 * (`createdAt desc`). Seed com vencimentos fora de ordem de criação: sob `dueDate asc` o topo seria
 * o de vencimento mais próximo; sob `createdAt desc`, o último lançado. Cobre CA1/CA2.
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

const openBody = (documentNumber: string, dueDate: string) => ({
  type: 'NFS-e',
  documentNumber,
  supplierRef: SUP,
  paymentMethod: 'PIX',
  grossValueCents: '100000',
  retentions: [],
  registeredTaxes: [],
  dueDate,
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

  const post = (body: Record<string, unknown>) =>
    handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: body,
    });
  // Ordem de criação: A → B → C. Vencimentos FORA dessa ordem (A mais próximo, C no meio, B distante).
  await post(openBody('OPEN-A', '2026-01-31'));
  await post(openBody('OPEN-B', '2026-12-31'));
  await post(openBody('OPEN-C', '2026-06-30'));
});

after(async () => {
  await handle.teardown();
});

interface PayableItem {
  documentNumber: string | null;
}
interface PayablePage {
  items: PayableItem[];
}

describe('FIN-PAYABLE-ORDER-RECENT — /payable-titles ordem por mais recente (#263)', () => {
  it('CA1 — pág. 1 traz o lançamento mais recente (OPEN-C) no topo, não o de vencimento mais próximo', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/payable-titles?pageSize=10',
      headers: { authorization: `Bearer ${WRITER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const page = res.json() as PayablePage;
    assert.equal(page.items[0]?.documentNumber, 'OPEN-C');
  });

  it('CA2 — ordem completa é createdAt desc: C, B, A', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/payable-titles?pageSize=10',
      headers: { authorization: `Bearer ${WRITER}` },
    });
    const page = res.json() as PayablePage;
    assert.deepEqual(
      page.items.map((i) => i.documentNumber),
      ['OPEN-C', 'OPEN-B', 'OPEN-A'],
    );
  });
});
