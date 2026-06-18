/**
 * CA6 (#120) — testes HTTP da borda /api/v2/financial/bank-statements (US1 conciliação).
 *
 * Driver: memory (sem Docker), parser real (OFX/CSV) injetado pela composição. Auth via hooks FAKE
 * (o "token" Bearer carrega as permissões separadas por vírgula). Fastify.inject por cenário.
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

const IMPORTER = 'reconciliation:import,reconciliation:read';
const READER = 'reconciliation:read';
const PLAIN = 'none'; // token válido, sem permissões de conciliação → 403

const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
// Conta-débito distinta por cenário: o dedup é por (conta, fitid) e o FITID sintético do CSV é
// determinístico — reimportar o mesmo CSV na mesma conta descartaria tudo (comportamento esperado).
const ACCOUNT_POST = 'a1111111-1111-4111-8111-111111111111';
const ACCOUNT_GET = 'a2222222-2222-4222-8222-222222222222';
const ACCOUNT_MISC = 'a3333333-3333-4333-8333-333333333333';

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

// CSV de banco BR: `data;tipo;valor;nome;descricao;saldo`. Sem FITID nativo → sintetizado no domínio.
const CSV = [
  'data;tipo;valor;nome;descricao;saldo',
  '2024-05-18;DEBITO;10.00;FORNECEDOR X;pagamento;500.00',
  '2024-05-19;CREDITO;20.00;CLIENTE Y;recebimento;520.00',
].join('\n');

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

const importStatement = (token: string, account: string, content = CSV) =>
  handle.app.inject({
    method: 'POST',
    url: '/api/v2/financial/bank-statements',
    headers: { authorization: `Bearer ${token}` },
    payload: { debitAccountRef: account, format: 'CSV', content },
  });

describe('financial/http — bank-statements (US1)', () => {
  it('CA6: POST importa extrato → 201 { statementId, imported, duplicatesDiscarded }', async () => {
    const res = await importStatement(IMPORTER, ACCOUNT_POST);
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as {
      statementId: string;
      imported: number;
      duplicatesDiscarded: number;
      period: { start: string; end: string };
    };
    assert.equal(body.imported, 2);
    assert.equal(body.duplicatesDiscarded, 0);
    assert.match(body.statementId, /^[0-9a-f-]{36}$/);
    assert.ok(body.period.start.length > 0);
  });

  it('CA6: GET .../:id/transactions lista as transações importadas', async () => {
    const created = await importStatement(IMPORTER, ACCOUNT_GET);
    const { statementId } = created.json() as { statementId: string };

    const res = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/bank-statements/${statementId}/transactions`,
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      items: { movement: string; entryType: string; reconciliationStatus: string }[];
    };
    assert.equal(body.items.length, 2);
    assert.equal(body.items[0]?.reconciliationStatus, 'Pending');
    assert.ok(body.items.some((t) => t.movement === 'Credit'));
  });

  it('CA6: GET transações de extrato inexistente → 404', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/bank-statements/dddddddd-dddd-4ddd-8ddd-dddddddddddd/transactions',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 404, res.body);
  });

  it('CA6: POST sem permissão reconciliation:import → 403', async () => {
    const res = await importStatement(PLAIN, ACCOUNT_MISC);
    assert.equal(res.statusCode, 403, res.body);
  });

  it('CA6: POST CSV malformado → 400', async () => {
    const res = await importStatement(IMPORTER, ACCOUNT_MISC, 'só-uma-linha-sem-header');
    assert.equal(res.statusCode, 400, res.body);
  });
});
