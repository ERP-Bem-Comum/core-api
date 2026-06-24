/**
 * #141/#247 — testes HTTP da conciliação parcial + lançamento classificado da diferença.
 *
 * Driver: memory com stores semeados (transação Pending 6000 + título Paid 8000 + conta Active).
 * Cobre: CA3 (diferença classificada → ManualEntry vinculado), CA4 (parcial → reconciledValueCents
 * real), CA5 (sinal incoerente → 422 difference-sign-invalid).
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
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import {
  createInMemoryPayableReconciliationView,
  type PayableStore,
} from '#src/modules/financial/adapters/persistence/repos/payable-reconciliation-view.in-memory.ts';
import {
  createInMemoryReconciliationRepository,
  type ReconciliationStore,
} from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { confirmReconciliation } from '#src/modules/financial/application/use-cases/confirm-reconciliation.ts';
import { searchPaidPayables } from '#src/modules/financial/application/use-cases/search-paid-payables.ts';

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
let TX_PARTIAL_ID = ''; // 6000 → parcial contra título 8000 (saldo aberto 2000)
let TX_DISCOUNT_ID = ''; // 7600 → desconto −400 contra título 8000 (fecha + ManualEntry)
let recons: ReconciliationStore;
const PAYABLE_PARTIAL = PayableId.generate();
const PAYABLE_DISCOUNT = PayableId.generate();
const PARTIAL_VALUE = 6000;
const DISCOUNT_TX_VALUE = 7600;
const PAYABLE_VALUE = 8000;

const seedPayable = (id: string, status: DocumentStatus, valueCents: number) => ({
  id,
  documentId: String(DocumentId.generate()),
  status,
  valueCents,
  dueDate: new Date('2024-05-30T00:00:00.000Z'),
  paymentMethod: 'PIX',
});

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
      closingBalanceCents: PARTIAL_VALUE + DISCOUNT_TX_VALUE,
      transactions: [
        {
          fitid: fitidOf('f-tx-partial'),
          date: new Date('2024-05-18T00:00:00.000Z'),
          movement: 'Debit',
          entryType: 'TED',
          payeeName: 'FORNECEDOR X',
          memo: 'pagamento parcial',
          valueCents: PARTIAL_VALUE,
          balanceAfterCents: 0,
        },
        {
          fitid: fitidOf('f-tx-discount'),
          date: new Date('2024-05-18T00:00:00.000Z'),
          movement: 'Debit',
          entryType: 'TED',
          payeeName: 'FORNECEDOR Y',
          memo: 'pagamento com desconto',
          valueCents: DISCOUNT_TX_VALUE,
          balanceAfterCents: 0,
        },
      ],
      occurredAt: new Date('2024-05-19T09:00:00.000Z'),
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  const statement = imported.value.statement;
  const txPartial = statement.transactions[0];
  const txDiscount = statement.transactions[1];
  if (txPartial === undefined || txDiscount === undefined) throw new Error('setup: tx');
  TX_PARTIAL_ID = String(txPartial.id);
  TX_DISCOUNT_ID = String(txDiscount.id);

  const statementStore: BankStatementStore = new Map([[statement.id, statement]]);
  const payableStore: PayableStore = new Map([
    [String(PAYABLE_PARTIAL), seedPayable(String(PAYABLE_PARTIAL), 'Paid', PAYABLE_VALUE)],
    [String(PAYABLE_DISCOUNT), seedPayable(String(PAYABLE_DISCOUNT), 'Paid', PAYABLE_VALUE)],
  ]);
  recons = new Map();

  const cedenteStore = createInMemoryCedenteAccountStore();
  await cedenteStore.save(account.value);
  const statementRepo = createInMemoryBankStatementRepository(statementStore);
  const payableView = createInMemoryPayableReconciliationView(payableStore);
  const reconRepo = createInMemoryReconciliationRepository({
    reconciliations: recons,
    payables: payableStore,
    statements: statementStore,
  });
  const clock = ClockReal();
  const periods = createInMemoryReconciliationPeriodStore();

  const deps = {
    ...base,
    confirmReconciliation: confirmReconciliation({
      reconciliationRepo: reconRepo,
      payables: payableView,
      statements: statementRepo,
      cedenteStore,
      periods,
      clock,
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

describe('financial/http — conciliação parcial + diferença classificada (#141/#247)', () => {
  it('CA5: Discount com valueCents > 0 → 422 (difference-sign-invalid não vaza)', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/reconciliations',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: {
        transactionId: TX_DISCOUNT_ID,
        payableIds: [String(PAYABLE_DISCOUNT)],
        difference: { valueCents: 999, treatment: 'Discount' },
      },
    });
    assert.equal(res.statusCode, 422, res.body);
  });

  it('CA4: parcial (Partial −2000, allocations 6000) → 201, Partial, reconciledValueCents = 6000', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/reconciliations',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: {
        transactionId: TX_PARTIAL_ID,
        payableIds: [String(PAYABLE_PARTIAL)],
        allocations: [{ payableId: String(PAYABLE_PARTIAL), reconciledValueCents: PARTIAL_VALUE }],
        difference: { valueCents: -(PAYABLE_VALUE - PARTIAL_VALUE), treatment: 'Partial' },
      },
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as { reconciliationId: string; type: string };
    assert.equal(body.type, 'Partial');

    // CA4: reconciledValueCents reflete o valor REAL alocado (6000), não o do título (8000).
    const stored = recons.get(body.reconciliationId);
    assert.ok(stored, 'conciliação deve estar persistida');
    assert.equal(stored?.items[0]?.reconciledValueCents, PARTIAL_VALUE);
  });

  it('CA3: diferença classificada (Discount −400, centro de custo + nota) → 201 + ManualEntry vinculado', async () => {
    const res = await handle.app.inject({
      method: 'POST',
      url: '/api/v2/financial/reconciliations',
      headers: { authorization: `Bearer ${WRITER}` },
      payload: {
        transactionId: TX_DISCOUNT_ID,
        payableIds: [String(PAYABLE_DISCOUNT)],
        difference: {
          valueCents: -(PAYABLE_VALUE - DISCOUNT_TX_VALUE),
          treatment: 'Discount',
          costCenterRef: 'cc-001',
          note: 'desconto concedido',
        },
      },
    });
    assert.equal(res.statusCode, 201, res.body);
    const body = res.json() as { reconciliationId: string; type: string };
    assert.equal(body.type, 'Partial');

    // CA3: a diferença classificada gerou um ManualEntry vinculado com o centro de custo informado.
    const stored = recons.get(body.reconciliationId);
    assert.ok(stored?.manualEntry, 'ManualEntry deve estar vinculado à conciliação');
    assert.equal(stored?.manualEntry?.costCenterRef, 'cc-001');
  });
});
