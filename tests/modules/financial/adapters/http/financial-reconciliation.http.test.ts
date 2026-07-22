/**
 * CA10 (#123) — testes HTTP da borda /api/v2/financial/reconciliations + /payables (US2/US3/US4).
 *
 * Driver: memory com stores SEMEADOS diretamente (não há rota que põe título em `Paid` — isso é a 016).
 * Monta `FinancialHttpDeps` reaproveitando a base e sobrescrevendo os deps de conciliação com repos
 * in-memory semeados (transação Pending + título Paid + conta Active). Auth via hooks FAKE.
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
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as DocumentId from '#src/modules/financial/domain/shared/document-id.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import {
  createInMemoryPayableReconciliationView,
  type PayableStore,
} from '#src/modules/financial/adapters/persistence/repos/payable-reconciliation-view.in-memory.ts';
import { createInMemoryReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import { createInMemoryExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { confirmReconciliation } from '#src/modules/financial/application/use-cases/confirm-reconciliation.ts';
import { undoReconciliation } from '#src/modules/financial/application/use-cases/undo-reconciliation.ts';
import { searchPaidPayables } from '#src/modules/financial/application/use-cases/search-paid-payables.ts';

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

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}

let handle: AppHandle;
let TX_ID = '';
const PAYABLE_A = PayableId.generate();
const PAYABLE_B = PayableId.generate();

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
      period: {
        start: new Date('2024-05-01T00:00:00.000Z'),
        end: new Date('2024-05-31T00:00:00.000Z'),
      },
      file: { name: 'e.ofx', format: 'OFX', hash: 'h1' },
      openingBalanceCents: 0,
      closingBalanceCents: 1000,
      transactions: [
        {
          fitid: fitidOf('f-tx-1'),
          date: new Date('2024-05-18T00:00:00.000Z'),
          movement: 'Debit',
          entryType: 'TED',
          payeeName: 'FORNECEDOR X',
          memo: 'pagamento',
          valueCents: 1000,
          balanceAfterCents: 0,
        },
      ],
      occurredAt: new Date('2024-05-19T09:00:00.000Z'),
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  const statement = imported.value.statement;
  const tx = statement.transactions[0];
  if (tx === undefined) throw new Error('setup: tx');
  TX_ID = String(tx.id);

  const statementStore: BankStatementStore = new Map([[statement.id, statement]]);
  const payableStore: PayableStore = new Map([
    [
      String(PAYABLE_A),
      {
        id: String(PAYABLE_A),
        documentId: String(DocumentId.generate()),
        status: 'Paid',
        valueCents: 1000,
        dueDate: new Date('2024-05-30T00:00:00.000Z'),
        paymentMethod: 'PIX',
      },
    ],
    [
      String(PAYABLE_B),
      {
        id: String(PAYABLE_B),
        documentId: String(DocumentId.generate()),
        status: 'Paid',
        valueCents: 500,
        dueDate: new Date('2024-05-30T00:00:00.000Z'),
        paymentMethod: 'PIX',
      },
    ],
  ]);

  const cedenteStore = createInMemoryCedenteAccountStore();
  await cedenteStore.save(account.value);
  const statementRepo = createInMemoryBankStatementRepository(statementStore);
  const payableView = createInMemoryPayableReconciliationView(payableStore);
  const reconRepo = createInMemoryReconciliationRepository({
    payables: payableStore,
    statements: statementStore,
  });
  const clock = ClockReal();
  const periods = createInMemoryReconciliationPeriodStore();

  const deps = {
    ...base,
    listStatementTransactions: statementRepo.listTransactions,
    confirmReconciliation: confirmReconciliation({
      reconciliationRepo: reconRepo,
      payables: payableView,
      statements: statementRepo,
      cedenteStore,
      periods,
      clock,
    }),
    undoReconciliation: undoReconciliation({
      reconciliationRepo: reconRepo,
      statements: statementRepo,
      periods,
      clock,
      expectedCounterpartStore: createInMemoryExpectedCounterpartStore(),
    }),
    searchPaidPayables: searchPaidPayables({ payables: payableView }),
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

describe('financial/http — reconciliations (US2/3/4)', () => {
  it('CA10: GET /payables?status=Paid → 200 lista títulos Paid', async () => {
    const res = await handle.app.inject({
      method: 'GET',
      url: '/api/v2/financial/payables?status=Paid',
      headers: { authorization: `Bearer ${READER}` },
    });
    assert.equal(res.statusCode, 200, res.body);
    const body = res.json() as { items: { id: string }[] };
    assert.ok(body.items.some((p) => p.id === String(PAYABLE_B)));
  });

  it('CA10: POST /reconciliations → 201 e POST /:id/undo → 200', async () => {
    const created = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/reconciliations',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: { transactionId: TX_ID, payableIds: [String(PAYABLE_A)] },
    });
    assert.equal(created.statusCode, 201, created.body);
    const body = created.json() as { reconciliationId: string; type: string; itemCount: number };
    assert.equal(body.type, 'Individual');
    assert.equal(body.itemCount, 1);

    const undone = await handle.app.inject({
      method: 'POST',
      url: `/api/v2/financial/reconciliations/${body.reconciliationId}/undo`,
      headers: { authorization: `Bearer ${WRITER}` },
      payload: { reason: 'erro' },
    });
    assert.equal(undone.statusCode, 200, undone.body);
    assert.equal((undone.json() as { status: string }).status, 'Undone');
  });

  it('CA10: POST /reconciliations sem permissão write → 403', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/reconciliations',
      headers: { authorization: `Bearer ${READER}` },
      payload: { transactionId: TX_ID, payableIds: [String(PAYABLE_A)] },
    });
    assert.equal(res.statusCode, 403, res.body);
  });

  it('CA10: POST com transação inexistente → 404', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/reconciliations',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: {
        transactionId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        payableIds: [String(PAYABLE_A)],
      },
    });
    assert.equal(res.statusCode, 404, res.body);
  });
});
