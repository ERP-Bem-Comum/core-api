/**
 * #139 — borda HTTP: GET /cedente-accounts/:id/statement (read-model do extrato).
 * Smoke: cria conta-cedente (com saldo de abertura) e lê o extrato do período → 200.
 * Sem extrato importado, a view vem vazia (days []), counters zerados, opening refletido.
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

const TOKEN = 'bank-account:write,bank-account:read,reconciliation:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';

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

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;

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

describe('financial/http — statement read-model (#139)', () => {
  it('cria conta + GET statement → 200, opening refletido, view vazia sem extrato', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: {
        bankCode: '237',
        bankName: 'Bradesco',
        type: 'corrente',
        agency: '1234',
        accountNumber: '567890',
        accountDigit: '1',
        document: '12345678000190',
        nickname: 'Principal',
        openingBalanceCents: '500000',
        openingBalanceDate: '2026-01-01',
      },
    });
    assert.equal(created.statusCode, 201, created.body);
    const id = (created.json() as { id: string }).id;

    const res = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/cedente-accounts/${id}/statement?from=2026-01-01&to=2026-01-31`,
      headers: { authorization: `Bearer ${TOKEN}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const view = res.json() as {
      openingBalanceCents: string;
      closingBalanceCents: string;
      days: unknown[];
      counters: { all: number };
    };
    assert.equal(view.openingBalanceCents, '500000');
    assert.equal(view.closingBalanceCents, '500000'); // sem transações
    assert.equal(view.days.length, 0);
    assert.equal(view.counters.all, 0);
  });

  it('GET statement sem reconciliation:read → 403', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/cedente-accounts',
      headers: { authorization: `Bearer ${TOKEN}` },
      payload: {
        bankCode: '341',
        bankName: 'Itau',
        type: 'corrente',
        agency: '4321',
        accountNumber: '111222',
        accountDigit: '3',
        document: '98765432000100',
        nickname: 'Secundaria',
      },
    });
    assert.equal(created.statusCode, 201, created.body);
    const id = (created.json() as { id: string }).id;

    const res = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/cedente-accounts/${id}/statement?from=2026-01-01&to=2026-01-31`,
      headers: { authorization: 'Bearer bank-account:read' },
    });
    assert.equal(res.statusCode, 403, res.body);
  });
});
