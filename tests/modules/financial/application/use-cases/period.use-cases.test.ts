// CA close/export + guard CA4 (#125) — closeReconciliationPeriod, exportReconciliation e o guard
// period-closed (via recordManualEntry). Adapters in-memory reais.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok } from '#src/shared/index.ts';
import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import type { ParsedTransaction } from '#src/modules/financial/domain/statement/types.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { createInMemoryReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import { createInMemoryExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryPayableReconciliationView } from '#src/modules/financial/adapters/persistence/repos/payable-reconciliation-view.in-memory.ts';
import { bankStatementParser } from '#src/modules/financial/adapters/statement-parsers/bank-statement-parser.ts';
import { reconciliationExporter } from '#src/modules/financial/adapters/export/reconciliation-exporter.ts';
import { closeReconciliationPeriod } from '#src/modules/financial/application/use-cases/close-reconciliation-period.ts';
import { exportReconciliation } from '#src/modules/financial/application/use-cases/export-reconciliation.ts';
import { recordManualEntry } from '#src/modules/financial/application/use-cases/record-manual-entry.ts';
import { importBankStatement } from '#src/modules/financial/application/use-cases/import-bank-statement.ts';
import { confirmReconciliation } from '#src/modules/financial/application/use-cases/confirm-reconciliation.ts';
import { undoReconciliation } from '#src/modules/financial/application/use-cases/undo-reconciliation.ts';
import { confirm as domainConfirm } from '#src/modules/financial/domain/reconciliation/reconciliation.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';

const ACCOUNT = '11111111-1111-4111-8111-111111111111';
const START = new Date('2024-05-01T00:00:00.000Z');
const END = new Date('2024-05-31T00:00:00.000Z');
const IN_PERIOD = new Date('2024-05-18T00:00:00.000Z');

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};

const statementRepoWith = (txs: readonly ParsedTransaction[]) => {
  const store: BankStatementStore = new Map();
  if (txs.length > 0) {
    const imported = importStatement(
      {
        debitAccountRef: ACCOUNT,
        period: { start: START, end: END },
        file: { name: 'e.ofx', format: 'OFX', hash: 'h1' },
        openingBalanceCents: 0,
        closingBalanceCents: 0,
        transactions: txs,
        occurredAt: IN_PERIOD,
      },
      new Set(),
    );
    if (!imported.ok) throw new Error('setup: importStatement');
    store.set(imported.value.statement.id, imported.value.statement);
  }
  return { repo: createInMemoryBankStatementRepository(store), store };
};

const tx = (raw: string): ParsedTransaction => ({
  fitid: fitidOf(raw),
  date: IN_PERIOD,
  movement: 'Debit',
  entryType: 'Fee',
  payeeName: 'BANCO',
  memo: 'tarifa',
  valueCents: 990,
  balanceAfterCents: 0,
});

describe('financial/application/use-cases/close-reconciliation-period', () => {
  it('CA1: período sem pendências → Closed', async () => {
    const { repo } = statementRepoWith([]); // período vazio → sem pendência
    const r = await closeReconciliationPeriod({
      periodStore: createInMemoryReconciliationPeriodStore(),
      statements: repo,
      clock: ClockReal(),
    })({ debitAccountRef: ACCOUNT, periodStart: START, periodEnd: END, closedBy: 'u1' });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (r.ok) assert.equal(r.value.status, 'Closed');
  });

  it('CA2: período com transação Pending → period-has-pending-transactions', async () => {
    const { repo } = statementRepoWith([tx('f0')]); // tx Pending no período
    const r = await closeReconciliationPeriod({
      periodStore: createInMemoryReconciliationPeriodStore(),
      statements: repo,
      clock: ClockReal(),
    })({ debitAccountRef: ACCOUNT, periodStart: START, periodEnd: END, closedBy: 'u1' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'period-has-pending-transactions');
  });
});

describe('financial/application/use-cases/export-reconciliation', () => {
  it('CA5: exporta CSV do período fechado', async () => {
    const { repo } = statementRepoWith([]);
    const periodStore = createInMemoryReconciliationPeriodStore();
    const closed = await closeReconciliationPeriod({
      periodStore,
      statements: repo,
      clock: ClockReal(),
    })({ debitAccountRef: ACCOUNT, periodStart: START, periodEnd: END, closedBy: 'u1' });
    assert.equal(closed.ok, true);
    if (!closed.ok) return;

    const r = await exportReconciliation({
      periodStore,
      statements: repo,
      exporter: reconciliationExporter,
    })({
      periodId: String(closed.value.periodId),
      format: 'csv',
    });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (r.ok) {
      assert.equal(r.value.format, 'csv');
      assert.match(r.value.content, /data;fitid;movimento/);
    }
  });

  it('CA5: período inexistente → reconciliation-period-not-found', async () => {
    const { repo } = statementRepoWith([]);
    const r = await exportReconciliation({
      periodStore: createInMemoryReconciliationPeriodStore(),
      statements: repo,
      exporter: reconciliationExporter,
    })({ periodId: '22222222-2222-4222-8222-222222222222', format: 'csv' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'reconciliation-period-not-found');
  });
});

describe('financial — guard period-closed (CA4)', () => {
  it('lançamento manual em período fechado → period-closed', async () => {
    const { repo, store } = statementRepoWith([tx('f0')]);
    const periodStore = createInMemoryReconciliationPeriodStore();
    // Fecha o período cobrindo a data da transação.
    const closed = await closeReconciliationPeriod({
      periodStore,
      statements: createInMemoryBankStatementRepository(new Map()), // período "vazio" p/ poder fechar
      clock: ClockReal(),
    })({ debitAccountRef: ACCOUNT, periodStart: START, periodEnd: END, closedBy: 'u1' });
    assert.equal(closed.ok, true);

    const accId = CedenteAccountId.rehydrate(ACCOUNT);
    if (!accId.ok) throw new Error('setup: accId');
    const account = createCedente({
      id: accId.value,
      bankCode: '237',
      agency: '1234',
      accountNumber: '567890',
      accountDigit: '1',
      convenio: '9999999',
      document: '12345678000190',
    });
    if (!account.ok) throw new Error('setup: cedente');
    const cedenteStore = createInMemoryCedenteAccountStore();
    await cedenteStore.save(account.value);

    const txId = [...store.values()][0]?.transactions[0]?.id;
    if (txId === undefined) throw new Error('setup: txId');

    const r = await recordManualEntry({
      reconciliationRepo: createInMemoryReconciliationRepository({
        payables: new Map(),
        statements: store,
      }),
      statements: repo,
      cedenteStore,
      periods: periodStore,
      clock: ClockReal(),
      expectedCounterpartStore: createInMemoryExpectedCounterpartStore(),
    })({ transactionId: String(txId), type: 'FeePenaltyInterest', reconciledBy: 'u1' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'period-closed');
  });

  // Fecha o período de maio (vazio) e devolve o store já com o período Closed.
  const closedMayStore = async () => {
    const store = createInMemoryReconciliationPeriodStore();
    const r = await closeReconciliationPeriod({
      periodStore: store,
      statements: createInMemoryBankStatementRepository(new Map()),
      clock: ClockReal(),
    })({ debitAccountRef: ACCOUNT, periodStart: START, periodEnd: END, closedBy: 'u1' });
    if (!r.ok) throw new Error('setup: close');
    return store;
  };

  const activeAccountStore = async () => {
    const accId = CedenteAccountId.rehydrate(ACCOUNT);
    if (!accId.ok) throw new Error('setup: accId');
    const account = createCedente({
      id: accId.value,
      bankCode: '237',
      agency: '1234',
      accountNumber: '567890',
      accountDigit: '1',
      convenio: '9999999',
      document: '12345678000190',
    });
    if (!account.ok) throw new Error('setup: cedente');
    const store = createInMemoryCedenteAccountStore();
    await store.save(account.value);
    return store;
  };

  it('importar em período fechado → period-closed', async () => {
    const periodStore = await closedMayStore();
    const csv = [
      'data;tipo;valor;nome;descricao;saldo',
      '2024-05-18;DEBITO;10.00;X;pag;500.00',
    ].join('\n');
    // Guard de integridade (#160): ACCOUNT deve referenciar um cedente existente p/ chegar ao guard de período.
    const accId = CedenteAccountId.rehydrate(ACCOUNT);
    if (!accId.ok) throw new Error('setup: account id');
    const acc = createCedente({
      id: accId.value,
      bankCode: '237',
      agency: '1234',
      accountNumber: '567890',
      accountDigit: '1',
      convenio: '9999999',
      document: '12345678000190',
    });
    if (!acc.ok) throw new Error('setup: cedente');
    const cedenteStore = createInMemoryCedenteAccountStore();
    await cedenteStore.save(acc.value);
    const r = await importBankStatement({
      parser: bankStatementParser,
      repo: createInMemoryBankStatementRepository(),
      periods: periodStore,
      cedenteStore,
      clock: ClockReal(),
    })({ debitAccountRef: ACCOUNT, format: 'CSV', content: csv });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'period-closed');
  });

  it('conciliar em período fechado → period-closed', async () => {
    const { repo, store } = statementRepoWith([tx('fc')]);
    const periodStore = await closedMayStore();
    const cedenteStore = await activeAccountStore();
    const txId = [...store.values()][0]?.transactions[0]?.id;
    if (txId === undefined) throw new Error('setup: txId');

    const r = await confirmReconciliation({
      reconciliationRepo: createInMemoryReconciliationRepository({
        payables: new Map(),
        statements: store,
      }),
      payables: createInMemoryPayableReconciliationView(),
      statements: repo,
      cedenteStore,
      periods: periodStore,
      clock: ClockReal(),
    })({
      transactionId: String(txId),
      payableIds: [String(PayableId.generate())],
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'period-closed');
  });

  it('desfazer conciliação em período fechado → period-closed', async () => {
    const { repo, store } = statementRepoWith([tx('fu')]);
    const periodStore = await closedMayStore();
    const txObj = [...store.values()][0]?.transactions[0];
    if (txObj === undefined) throw new Error('setup: tx');

    const built = domainConfirm({
      reconciliationId: ReconciliationId.generate(),
      transactionId: txObj.id,
      transactionValueCents: txObj.valueCents,
      payables: [{ id: PayableId.generate(), status: 'Paid', valueCents: txObj.valueCents }],
      reconciledBy: 'u1',
      occurredAt: ClockReal().now(),
    });
    if (!built.ok) throw new Error('setup: confirm');
    const recon = built.value.reconciliation;

    const r = await undoReconciliation({
      reconciliationRepo: {
        findById: () => Promise.resolve(ok(recon)),
        undo: () => Promise.resolve(ok(undefined)),
      },
      statements: repo,
      periods: periodStore,
      clock: ClockReal(),
    })({ reconciliationId: String(recon.id), undoneBy: 'u2' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'period-closed');
  });
});
