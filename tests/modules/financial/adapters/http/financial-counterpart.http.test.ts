/**
 * Borda /statement-transactions/:id/counterpart-suggestions + /reconciliations/counterpart (US2 · #269).
 * Driver memory com stores SEMEADOS (contrapartida Pending em B + extrato Credit Pending). Auth fake.
 */

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler, LightMyRequestResponse } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import {
  financialHttpPlugin,
  buildFinancialHttpDeps,
} from '#src/modules/financial/public-api/http.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as ExpectedCounterpartId from '#src/modules/financial/domain/expected-counterpart/expected-counterpart-id.ts';
import * as ExpectedCounterpart from '#src/modules/financial/domain/expected-counterpart/expected-counterpart.ts';
import type { ExpectedCounterpart as ExpectedCounterpartT } from '#src/modules/financial/domain/expected-counterpart/types.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import type { ParsedTransaction } from '#src/modules/financial/domain/statement/types.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import { createInMemoryReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import { createInMemoryExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { suggestCounterpartMatches } from '#src/modules/financial/application/use-cases/suggest-counterpart-matches.ts';
import { confirmCounterpartMatch } from '#src/modules/financial/application/use-cases/confirm-counterpart-match.ts';

const WRITER = 'reconciliation:write,reconciliation:read';
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

const D = new Date('2026-07-01T00:00:00.000Z');
const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};
const creditTx = (raw: string): ParsedTransaction => ({
  fitid: fitidOf(raw),
  date: D,
  movement: 'Credit',
  entryType: 'TED',
  payeeName: 'TRANSFERENCIA',
  memo: 'transf',
  valueCents: 150000,
  balanceAfterCents: 0,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;
let txId: string;
let counterpartId: string;

before(async () => {
  const base = await buildFinancialHttpDeps({ driver: 'memory' });
  const accountB = createCedente({
    id: CedenteAccountId.generate(),
    bankCode: '341',
    agency: '1234',
    accountNumber: '112233',
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
  });
  if (!accountB.ok) throw new Error('setup: cedente B');

  const imported = importStatement(
    {
      debitAccountRef: String(accountB.value.id),
      period: { start: D, end: D },
      file: { name: 'b.ofx', format: 'OFX', hash: 'hB' },
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      transactions: [creditTx('fB')],
      occurredAt: D,
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  const statement = imported.value.statement;
  const first = statement.transactions[0];
  if (first === undefined) throw new Error('setup: tx');
  txId = String(first.id);

  const statementStore: BankStatementStore = new Map([[statement.id, statement]]);
  const statementRepo = createInMemoryBankStatementRepository(statementStore);
  const cedenteStore = createInMemoryCedenteAccountStore();
  await cedenteStore.save(accountB.value);

  const cpMap = new Map<string, ExpectedCounterpartT>();
  const counterpartStore = createInMemoryExpectedCounterpartStore(cpMap);
  const created = ExpectedCounterpart.create({
    id: ExpectedCounterpartId.generate(),
    destinationAccountRef: accountB.value.id,
    originAccountRef: CedenteAccountId.generate(),
    originReconciliationRef: ReconciliationId.generate(),
    originTransactionRef: newUuid(),
    originMovement: 'Debit',
    valueCents: 150000n,
    expectedDate: D,
  });
  if (!created.ok) throw new Error('setup: counterpart');
  counterpartId = String(created.value.counterpart.id);
  await counterpartStore.save(created.value.counterpart);

  const reconRepo = createInMemoryReconciliationRepository({
    payables: new Map(),
    statements: statementStore,
    expectedCounterparts: cpMap,
  });

  const deps = {
    ...base,
    suggestCounterpartMatches: suggestCounterpartMatches({
      statements: statementRepo,
      expectedCounterpartStore: counterpartStore,
    }),
    confirmCounterpartMatch: confirmCounterpartMatch({
      statements: statementRepo,
      cedenteStore,
      periods: createInMemoryReconciliationPeriodStore(),
      expectedCounterpartStore: counterpartStore,
      reconciliationRepo: reconRepo,
      clock: ClockReal(),
    }),
  };

  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(deps, { requireAuth, authorize })],
  });
  handle = { app, teardown: () => app.close() };
});

after(async () => {
  await handle.teardown();
});

const BASE = '/api/v2/financial';
const get = (url: string): Promise<LightMyRequestResponse> =>
  handle.app.inject({
    method: 'GET',
    url: `${BASE}${url}`,
    headers: { authorization: `Bearer ${WRITER}` },
  });
const post = (url: string, payload: Record<string, unknown>): Promise<LightMyRequestResponse> =>
  handle.app.inject({
    method: 'POST',
    url: `${BASE}${url}`,
    headers: { authorization: `Bearer ${WRITER}` },
    payload,
  });

describe('financial/http — contrapartida de transferência (US2 · #269)', () => {
  it('fluxo E2E: sugestão → confirm bogus (422) → confirm real (201) → sugestão vazia', async () => {
    const url = `/statement-transactions/${txId}/counterpart-suggestions`;

    // 1. GET sugestões → 1 contrapartida que casa (valor exato + janela).
    const sug = await get(url);
    assert.equal(sug.statusCode, 200, sug.body);
    const sugBody = sug.json() as { suggestions: { counterpartId: string; valueCents: string }[] };
    assert.equal(sugBody.suggestions.length, 1);
    assert.equal(sugBody.suggestions[0]!.counterpartId, counterpartId);
    assert.equal(sugBody.suggestions[0]!.valueCents, '150000', 'money como string');

    // 2. POST confirm com contrapartida inexistente → 422 (counterpart-not-found).
    const bogus = await post('/reconciliations/counterpart', {
      transactionId: txId,
      counterpartId: newUuid(),
    });
    assert.equal(bogus.statusCode, 422, bogus.body);

    // 3. POST confirm real → 201, consome a contrapartida.
    const ok = await post('/reconciliations/counterpart', {
      transactionId: txId,
      counterpartId,
    });
    assert.equal(ok.statusCode, 201, ok.body);
    const okBody = ok.json() as { counterpartId: string; reconciliationId: string };
    assert.equal(okBody.counterpartId, counterpartId);

    // 4. GET sugestões de novo → vazio (contrapartida virou Matched).
    const after2 = await get(url);
    assert.equal(after2.statusCode, 200);
    assert.equal((after2.json() as { suggestions: unknown[] }).suggestions.length, 0);
  });
});
