/**
 * FIN-RECON-EXECUTOR-NAME (#207) — borda HTTP: nome do executor/closer na conciliação.
 *
 * Padrão ADR-0032 (composição síncrona de leitura na borda, idêntico ao payeeBank #255).
 * A rota resolve o NOME de quem executou (`reconciledByName`, #175) e de quem fechou o
 * período (`closedByName`, #173) server-side via um `AuthUserReadPort` FAKE injetado em
 * `buildFinancialHttpDeps`, SEM exigir `user:read` do operador.
 *
 * Driver memory. Conciliação real criada via POST /reconciliations (escreve
 * `reconciledBy = TEST_USER_ID`). Auth via hooks FAKE.
 *
 * Critérios: CA1 (nome resolvido), CA2 (degradação graciosa → null), CA3 (período closedByName),
 * CA4 (reader sem user:read recebe o nome — 200, resolução server-side).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { preHandlerAsyncHookHandler } from 'fastify';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { ok } from '#src/shared/primitives/result.ts';
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
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { confirmReconciliation } from '#src/modules/financial/application/use-cases/confirm-reconciliation.ts';
import { closeReconciliationPeriod } from '#src/modules/financial/application/use-cases/close-reconciliation-period.ts';
import { listReconciliationPeriods } from '#src/modules/financial/application/use-cases/list-reconciliation-periods.ts';
import { getTransactionReconciliation } from '#src/modules/financial/application/use-cases/get-transaction-reconciliation.ts';
import type { AuthUserReadPort } from '#src/modules/auth/public-api/read.ts';

const WRITER = 'reconciliation:write,reconciliation:read';
const READER = 'reconciliation:read';
const CLOSER = 'reconciliation:close,reconciliation:read';
// O TEST_USER_ID é quem o hook fake injeta como req.userId → vira reconciledBy/closedBy.
const TEST_USER_ID = '99999999-9999-4999-8999-999999999999';
const TEST_USER_NAME = 'Maria Operadora';

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

// Fake do AuthUserReadPort: resolve só o TEST_USER_ID; qualquer outro id → ok(null).
const fakeAuthUserReadPort = (name: string | null): AuthUserReadPort => ({
  getUserName: (id: string) => Promise.resolve(id === TEST_USER_ID ? ok({ id, name }) : ok(null)),
});

interface AppHandle {
  app: Awaited<ReturnType<typeof buildApp>>;
  teardown: () => Promise<void>;
}

// Monta um app com a conciliação semeada + um AuthUserReadPort específico.
const buildHandle = async (
  authUserReadPort: AuthUserReadPort | undefined,
): Promise<{
  handle: AppHandle;
  txId: string;
  debitAccountRef: string;
}> => {
  const base = await buildFinancialHttpDeps(
    authUserReadPort === undefined ? { driver: 'memory' } : { driver: 'memory', authUserReadPort },
  );

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
  const debitAccountRef = String(cedenteId);

  const imported = importStatement(
    {
      debitAccountRef,
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
  const txId = String(tx.id);

  const payableA = PayableId.generate();
  const statementStore: BankStatementStore = new Map([[statement.id, statement]]);
  const payableStore: PayableStore = new Map([
    [
      String(payableA),
      {
        id: String(payableA),
        documentId: String(DocumentId.generate()),
        status: 'Paid',
        valueCents: 1000,
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
    // Aponta para o reconRepo SEMEADO deste handle (o da base está vazio).
    getTransactionReconciliation: getTransactionReconciliation({ reconciliationRepo: reconRepo }),
    closeReconciliationPeriod: closeReconciliationPeriod({
      periodStore: periods,
      statements: statementRepo,
      clock,
    }),
    listReconciliationPeriods: listReconciliationPeriods({ periodStore: periods }),
  };

  const config = readHttpConfig({ RATE_LIMIT_MAX: '10000' });
  const app = await buildApp({
    config,
    routes: [financialHttpPlugin(deps, { requireAuth, authorize })],
  });

  // Cria a conciliação real (reconciledBy = TEST_USER_ID).
  const created = await app.inject({
    method: 'POST',
    url: '/api/v2/financial/reconciliations',
    headers: { authorization: `Bearer ${WRITER}` },
    payload: { transactionId: txId, payableIds: [String(payableA)] },
  });
  if (created.statusCode !== 201) throw new Error(`setup: criar conciliação (${created.body})`);

  return {
    handle: {
      app,
      teardown: async () => {
        await app.close();
        await base.shutdown();
      },
    },
    txId,
    debitAccountRef,
  };
};

describe('financial/http — reconciledByName no lookup #175 (CA1/CA2/CA4)', () => {
  it('CA1: reconciledBy resolve a um nome → body inclui reconciledByName + reconciledBy UUID', async () => {
    const { handle, txId } = await buildHandle(fakeAuthUserReadPort(TEST_USER_NAME));
    try {
      const res = await handle.app.inject({
        method: 'GET',
        url: `/api/v2/financial/statement-transactions/${txId}/reconciliation`,
        headers: { authorization: `Bearer ${READER}` },
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { reconciledBy: string; reconciledByName: string | null };
      assert.equal(body.reconciledBy, TEST_USER_ID);
      assert.equal(body.reconciledByName, TEST_USER_NAME);
    } finally {
      await handle.teardown();
    }
  });

  it('CA2a: nome nulo (usuário existe sem nome) → reconciledByName = null, sem 5xx', async () => {
    const { handle, txId } = await buildHandle(fakeAuthUserReadPort(null));
    try {
      const res = await handle.app.inject({
        method: 'GET',
        url: `/api/v2/financial/statement-transactions/${txId}/reconciliation`,
        headers: { authorization: `Bearer ${READER}` },
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { reconciledByName: string | null };
      assert.equal(body.reconciledByName, null);
    } finally {
      await handle.teardown();
    }
  });

  it('CA2b: port ausente (não injetado) → reconciledByName = null (degradação graciosa)', async () => {
    const { handle, txId } = await buildHandle(undefined);
    try {
      const res = await handle.app.inject({
        method: 'GET',
        url: `/api/v2/financial/statement-transactions/${txId}/reconciliation`,
        headers: { authorization: `Bearer ${READER}` },
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { reconciledByName: string | null };
      assert.equal(body.reconciledByName, null);
    } finally {
      await handle.teardown();
    }
  });

  it('CA4: operador com reconciliation:read (sem user:read) recebe o nome (200, server-side)', async () => {
    const { handle, txId } = await buildHandle(fakeAuthUserReadPort(TEST_USER_NAME));
    try {
      // READER = só reconciliation:read; não tem user:read e a rota não chama GET /users/:id.
      const res = await handle.app.inject({
        method: 'GET',
        url: `/api/v2/financial/statement-transactions/${txId}/reconciliation`,
        headers: { authorization: `Bearer ${READER}` },
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { reconciledByName: string | null };
      assert.equal(body.reconciledByName, TEST_USER_NAME);
    } finally {
      await handle.teardown();
    }
  });
});

describe('financial/http — closedByName nos períodos #173 (CA3)', () => {
  it('CA3: período fechado com closedBy → lista inclui closedByName resolvido', async () => {
    const { handle, debitAccountRef } = await buildHandle(fakeAuthUserReadPort(TEST_USER_NAME));
    try {
      // Fecha o período (closedBy = TEST_USER_ID).
      const closed = await handle.app.inject({
        method: 'POST',
        url: '/api/v2/financial/reconciliation-periods/close',
        headers: { authorization: `Bearer ${CLOSER}` },
        payload: {
          debitAccountRef,
          periodStart: '2024-05-01',
          periodEnd: '2024-05-31',
        },
      });
      assert.equal(closed.statusCode, 200, closed.body);

      const res = await handle.app.inject({
        method: 'GET',
        url: `/api/v2/financial/reconciliation-periods?debitAccountRef=${debitAccountRef}`,
        headers: { authorization: `Bearer ${READER}` },
      });
      assert.equal(res.statusCode, 200, res.body);
      const body = res.json() as { closedBy: string | null; closedByName: string | null }[];
      const closedPeriod = body.find((p) => p.closedBy === TEST_USER_ID);
      assert.ok(closedPeriod !== undefined, 'período fechado presente');
      assert.equal(closedPeriod.closedByName, TEST_USER_NAME);
    } finally {
      await handle.teardown();
    }
  });
});
