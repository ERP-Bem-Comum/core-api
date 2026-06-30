/**
 * #293 (FIN-PAYABLE-ACCOUNT-ACTIVE) — W0 RED.
 * CA3: GET /cedente-accounts?status=active não lista contas encerradas (sem query = todas, compat).
 * CA6: POST /documents com conta-débito encerrada → 422.
 * Driver memory; auth FAKE com bank-account:* + fiscal-document:*.
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

const TOKEN = 'bank-account:write,bank-account:read,fiscal-document:write,fiscal-document:read';
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

const accountBody = (over: Record<string, unknown> = {}) => ({
  bankCode: '237',
  bankName: 'Bradesco',
  type: 'corrente',
  agency: '1234',
  accountNumber: '567890',
  accountDigit: '1',
  document: '12345678000190',
  nickname: 'Conta',
  ...over,
});

const nfseBody = (over: Record<string, unknown> = {}) => ({
  type: 'NFS-e',
  documentNumber: 'NFS-293',
  supplierRef: SUP,
  paymentMethod: 'PIX',
  grossValueCents: '1000000',
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

const createAccount = async (over: Record<string, unknown>): Promise<string> => {
  const res = await handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/cedente-accounts',
    headers: { authorization: `Bearer ${TOKEN}` },
    payload: accountBody(over),
  });
  assert.equal(res.statusCode, 201, res.body);
  return (res.json() as { id: string }).id;
};

before(async () => {
  const base = await buildFinancialHttpDeps({ driver: 'memory' });
  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(base, { requireAuth, authorize })],
  });
  handle = {
    app,
    teardown: async () => {
      await app.close();
      await base.shutdown();
    },
  };
});

after(async () => {
  await handle.teardown();
});

describe('financial/http — seletor Pagar da Conta + guard conta-débito (#293)', () => {
  it('CA3: ?status=active omite contas encerradas; sem query lista todas', async () => {
    const activeId = await createAccount({ accountNumber: '111111' });
    const closedId = await createAccount({ accountNumber: '222222' });
    const closed = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/cedente-accounts/${closedId}/close`,
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(closed.statusCode, 200, closed.body);

    const activeOnly = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/cedente-accounts?status=active',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(activeOnly.statusCode, 200, activeOnly.body);
    const ids = (activeOnly.json() as readonly { id: string }[]).map((a) => a.id);
    assert.ok(ids.includes(activeId), 'conta ativa deve aparecer');
    assert.ok(!ids.includes(closedId), 'conta encerrada NÃO deve aparecer no seletor');

    const all = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(all.statusCode, 200, all.body);
    const allIds = (all.json() as readonly { id: string }[]).map((a) => a.id);
    assert.ok(allIds.includes(closedId), 'sem query a listagem geral mantém as encerradas');
  });

  it('CA6: POST /documents com conta-débito encerrada → 422', async () => {
    const closedId = await createAccount({ accountNumber: '333333' });
    const closed = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/cedente-accounts/${closedId}/close`,
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(closed.statusCode, 200, closed.body);

    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/documents',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: nfseBody({ contaDebitoRef: closedId }),
    });
    assert.equal(res.statusCode, 422, res.body);
  });
});
