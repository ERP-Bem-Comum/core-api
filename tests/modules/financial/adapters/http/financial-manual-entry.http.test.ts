/**
 * CA5 (#124) — borda /statement-transactions/:id/manual-entry + /reconciliations/batch (US5).
 * Driver memory com stores SEMEADOS (extrato Pending + conta Active). Auth via hooks FAKE.
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
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import type { ParsedTransaction } from '#src/modules/financial/domain/statement/types.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import { createInMemoryReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import { createInMemoryExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { recordManualEntry } from '#src/modules/financial/application/use-cases/record-manual-entry.ts';
import { confirmBatch } from '#src/modules/financial/application/use-cases/confirm-batch.ts';

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

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};
const D = new Date('2024-05-18T00:00:00.000Z');
const tx = (raw: string): ParsedTransaction => ({
  fitid: fitidOf(raw),
  date: D,
  movement: 'Debit',
  entryType: 'Fee',
  payeeName: 'BANCO',
  memo: 'tarifa',
  valueCents: 990,
  balanceAfterCents: 0,
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}
let handle: AppHandle;
const txIds: string[] = [];

before(async () => {
  const base = await buildFinancialHttpDeps({ driver: 'memory' });
  const cedenteId = CedenteAccountId.generate();
  const account = createCedente({
    id: cedenteId,
    bankCode: '237',
    agency: '1234',
    accountNumber: '567890',
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
  });
  if (!account.ok) throw new Error('setup: cedente');

  const imported = importStatement(
    {
      debitAccountRef: String(cedenteId),
      period: { start: D, end: D },
      file: { name: 'e.ofx', format: 'OFX', hash: 'h1' },
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      transactions: [tx('f0'), tx('f1'), tx('f2')],
      occurredAt: D,
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  const statement = imported.value.statement;
  for (const t of statement.transactions) txIds.push(String(t.id));

  const statementStore: BankStatementStore = new Map([[statement.id, statement]]);
  const statementRepo = createInMemoryBankStatementRepository(statementStore);
  const cedenteStore = createInMemoryCedenteAccountStore();
  await cedenteStore.save(account.value);
  const reconRepo = createInMemoryReconciliationRepository({
    payables: new Map(),
    statements: statementStore,
  });
  const record = recordManualEntry({
    reconciliationRepo: reconRepo,
    statements: statementRepo,
    cedenteStore,
    periods: createInMemoryReconciliationPeriodStore(),
    clock: ClockReal(),
    expectedCounterpartStore: createInMemoryExpectedCounterpartStore(),
  });

  const deps = {
    ...base,
    recordManualEntry: record,
    confirmBatch: confirmBatch({ record }),
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

describe('financial/http — manual-entry / batch (US5)', () => {
  it('CA5: POST /manual-entry → 201 { reconciliationId, type:ManualEntry, manualEntryId }', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/statement-transactions/${String(txIds[0])}/manual-entry`,
      headers: { authorization: `Bearer ${WRITER}` },
      payload: { type: 'FeePenaltyInterest', description: 'tarifa bancária' },
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as { type: string; reconciliationId: string; manualEntryId: string };
    assert.equal(body.type, 'ManualEntry');
    assert.match(body.manualEntryId, /^[0-9a-f-]{36}$/);
  });

  it('CA5: POST /reconciliations/batch → 201 { created, reconciliationIds }', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/reconciliations/batch',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: { transactionIds: [txIds[1], txIds[2]], template: { type: 'Payment' } },
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as {
      created: number;
      reconciliationIds: string[];
      failed: unknown[];
    };
    assert.equal(body.created, 2);
    assert.equal(body.reconciliationIds.length, 2);
    assert.equal(body.failed.length, 0);
  });

  it('CA5: POST /manual-entry sem permissão write → 403', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/statement-transactions/${String(txIds[0])}/manual-entry`,
      headers: { authorization: `Bearer ${READER}` },
      payload: { type: 'Payment' },
    });
    assert.equal(res.statusCode, 403, res.body);
  });
});
