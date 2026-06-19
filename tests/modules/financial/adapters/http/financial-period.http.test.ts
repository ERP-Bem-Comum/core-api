/**
 * CA6 (#125) — borda /reconciliation-periods/close + /:id/export (US6). Driver memory com stores
 * SEMEADOS (extrato Pending em maio). Auth via hooks FAKE.
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
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { reconciliationExporter } from '#src/modules/financial/adapters/export/reconciliation-exporter.ts';
import { closeReconciliationPeriod } from '#src/modules/financial/application/use-cases/close-reconciliation-period.ts';
import { exportReconciliation } from '#src/modules/financial/application/use-cases/export-reconciliation.ts';

const CLOSER = 'reconciliation:close,reconciliation:read';
const READER = 'reconciliation:read';
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const ACCOUNT = 'a1111111-1111-4111-8111-111111111111';

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
  const fitid = Fitid.fromNative('f-may');
  if (!fitid.ok) throw new Error('setup: fitid');
  // Extrato com 1 transação Pending em maio (impede fechar maio).
  const imported = importStatement(
    {
      debitAccountRef: ACCOUNT,
      period: {
        start: new Date('2024-05-01T00:00:00.000Z'),
        end: new Date('2024-05-31T00:00:00.000Z'),
      },
      file: { name: 'e.ofx', format: 'OFX', hash: 'h1' },
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      transactions: [
        {
          fitid: fitid.value,
          date: new Date('2024-05-18T00:00:00.000Z'),
          movement: 'Debit',
          entryType: 'Fee',
          payeeName: 'BANCO',
          memo: 'tarifa',
          valueCents: 990,
          balanceAfterCents: 0,
        },
      ],
      occurredAt: new Date('2024-05-18T00:00:00.000Z'),
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  const statementStore: BankStatementStore = new Map([
    [imported.value.statement.id, imported.value.statement],
  ]);
  const statementRepo = createInMemoryBankStatementRepository(statementStore);
  const periodStore = createInMemoryReconciliationPeriodStore();

  const deps = {
    ...base,
    closeReconciliationPeriod: closeReconciliationPeriod({
      periodStore,
      statements: statementRepo,
      clock: ClockReal(),
      outbox: createInMemoryOutbox().port,
    }),
    exportReconciliation: exportReconciliation({
      periodStore,
      statements: statementRepo,
      exporter: reconciliationExporter,
    }),
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

describe('financial/http — reconciliation-periods (US6)', () => {
  it('CA6: POST close com pendências (maio) → 422', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/reconciliation-periods/close',
      headers: { authorization: `Bearer ${CLOSER}` },
      payload: { debitAccountRef: ACCOUNT, periodStart: '2024-05-01', periodEnd: '2024-05-31' },
    });
    assert.equal(res.statusCode, 422, res.body);
  });

  it('CA6: POST close período vazio (junho) → 200 e GET export → 200 (CSV)', async () => {
    const closed = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/reconciliation-periods/close',
      headers: { authorization: `Bearer ${CLOSER}` },
      payload: { debitAccountRef: ACCOUNT, periodStart: '2024-06-01', periodEnd: '2024-06-30' },
    });
    assert.equal(closed.statusCode, 200, closed.body);
    const body = closed.json() as { periodId: string; status: string };
    assert.equal(body.status, 'Closed');

    const exported = await handle.app.inject({
      method: 'GET',
      url: `/api/v2/financial/reconciliation-periods/${body.periodId}/export?format=csv`,
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(exported.statusCode, 200, exported.body);
    assert.match(exported.headers['content-type'] ?? '', /text\/csv/);
  });

  it('CA6: POST close sem permissão reconciliation:close → 403', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/reconciliation-periods/close',
      headers: { authorization: `Bearer ${READER}` },
      payload: { debitAccountRef: ACCOUNT, periodStart: '2024-07-01', periodEnd: '2024-07-31' },
    });
    assert.equal(res.statusCode, 403, res.body);
  });
});
