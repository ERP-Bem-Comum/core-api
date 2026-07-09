/**
 * CA6 (#121) — borda /statement-transactions/:id/suggestions + /reject-suggestion (US2, match).
 * Driver memory com stores SEMEADOS (statement Pending + candidatos). Auth via hooks FAKE.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import {
  createInMemorySuggestionView,
  type SuggestionCandidateStore,
} from '#src/modules/financial/adapters/persistence/repos/suggestion-view.in-memory.ts';
import { createInMemoryRejectedSuggestionRepository } from '#src/modules/financial/adapters/persistence/repos/rejected-suggestion-repository.in-memory.ts';
import { suggestMatches } from '#src/modules/financial/application/use-cases/suggest-matches.ts';
import { rejectSuggestion } from '#src/modules/financial/application/use-cases/reject-suggestion.ts';

const WRITER = 'reconciliation:write,reconciliation:read';
const READER = 'reconciliation:read';
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
let TX_ID = '';
const A = PayableId.generate();
const B = PayableId.generate();
const D = new Date('2024-05-18T00:00:00.000Z');

before(async () => {
  const base = await buildFinancialHttpDeps({ driver: 'memory' });
  const fitid = Fitid.fromNative('f-tx');
  if (!fitid.ok) throw new Error('setup: fitid');
  const imported = importStatement(
    {
      debitAccountRef: 'acc-1',
      period: { start: D, end: D },
      file: { name: 'e.ofx', format: 'OFX', hash: 'h1' },
      openingBalanceCents: 0,
      closingBalanceCents: 1000,
      transactions: [
        {
          fitid: fitid.value,
          date: D,
          movement: 'Debit',
          entryType: 'TED',
          payeeName: 'FORNECEDOR X',
          memo: 'pagamento ref NF-001',
          valueCents: 1000,
          balanceAfterCents: 0,
        },
      ],
      occurredAt: D,
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  const statement = imported.value.statement;
  const t = statement.transactions[0];
  if (t === undefined) throw new Error('setup: tx');
  TX_ID = String(t.id);

  const statementStore: BankStatementStore = new Map([[statement.id, statement]]);
  const candidates: SuggestionCandidateStore = new Map([
    [
      String(A),
      {
        payableId: String(A),
        valueCents: 1000,
        dueDate: D,
        paidAt: null,
        supplierRef: 's1',
        supplierName: 'FORNECEDOR X',
        documentNumber: 'NF-001',
      },
    ],
    [
      String(B),
      {
        payableId: String(B),
        valueCents: 1000,
        dueDate: D,
        paidAt: null,
        supplierRef: 's2',
        supplierName: null,
        documentNumber: null,
      },
    ],
  ]);

  const statementRepo = createInMemoryBankStatementRepository(statementStore);
  const view = createInMemorySuggestionView(candidates);
  const rejected = createInMemoryRejectedSuggestionRepository();

  const deps = {
    ...base,
    listStatementTransactions: statementRepo.listTransactions,
    suggestMatches: suggestMatches({ statements: statementRepo, suggestions: view, rejected }),
    rejectSuggestion: rejectSuggestion({ rejected, clock: ClockReal() }),
  };

  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(deps, { requireAuth, authorize })],
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

const getSuggestions = (token: string) =>
  handle.app.inject({
    method: 'GET',
    url: `/api/v2/financial/statement-transactions/${TX_ID}/suggestions`,
    headers: { authorization: `Bearer ${token}` },
  });

describe('financial/http — match (US2)', () => {
  it('CA6: GET suggestions → 200 ordenado (alta primeiro)', async () => {
    const res = await getSuggestions(READER);
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as {
      suggestions: {
        payableId: string;
        band: string;
        score: number;
        criteriaBreakdown: { criterion: string; weight: number; result: string }[];
      }[];
    };
    assert.equal(body.suggestions.length, 2);
    assert.equal(body.suggestions[0]?.payableId, String(A));
    assert.equal(body.suggestions[0]?.band, 'alta');
    // #140: breakdown por critério (peso + ok|parcial|falha) presente em cada sugestão.
    const breakdown = body.suggestions[0]?.criteriaBreakdown;
    assert.equal(breakdown?.length, 5);
    assert.equal(
      breakdown?.reduce((s, c) => s + c.weight, 0),
      100,
    );
    assert.ok(breakdown?.every((c) => ['ok', 'parcial', 'falha'].includes(c.result)));
  });

  it('CA6: POST reject-suggestion → 200 e a sugestão some do GET', async () => {
    const rej = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/statement-transactions/${TX_ID}/reject-suggestion`,
      headers: { authorization: `Bearer ${WRITER}` },
      payload: { payableId: String(A) },
    });
    assert.equal(rej.statusCode, 200, rej.body);

    const res = await getSuggestions(READER);
    const body = res.json() as { suggestions: { payableId: string }[] };
    assert.equal(body.suggestions.length, 1);
    assert.equal(body.suggestions[0]?.payableId, String(B));
  });

  it('CA6: POST reject sem permissão write → 403', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/statement-transactions/${TX_ID}/reject-suggestion`,
      headers: { authorization: `Bearer ${READER}` },
      payload: { payableId: String(B) },
    });
    assert.equal(res.statusCode, 403, res.body);
  });
});
