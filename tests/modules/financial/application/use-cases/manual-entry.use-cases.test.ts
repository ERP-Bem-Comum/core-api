// CA3/CA4 (#124) — recordManualEntry + confirmBatch com adapters in-memory reais.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import {
  create as createCedente,
  close as closeCedente,
} from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import type { ParsedTransaction } from '#src/modules/financial/domain/statement/types.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import { createInMemoryReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { recordManualEntry } from '#src/modules/financial/application/use-cases/record-manual-entry.ts';
import { confirmBatch } from '#src/modules/financial/application/use-cases/confirm-batch.ts';

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};

const D = new Date('2024-05-18T00:00:00.000Z');
const txOf = (raw: string, valueCents: number): ParsedTransaction => ({
  fitid: fitidOf(raw),
  date: D,
  movement: 'Debit',
  entryType: 'Fee',
  payeeName: 'BANCO',
  memo: 'tarifa',
  valueCents,
  balanceAfterCents: 0,
});

// Monta o mundo: conta Active + extrato com N transações Pending; devolve repos + ids.
const buildWorld = (txs: readonly ParsedTransaction[]) => {
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
      transactions: txs,
      occurredAt: D,
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  const statement = imported.value.statement;

  const statementStore: BankStatementStore = new Map([[statement.id, statement]]);
  const statementRepo = createInMemoryBankStatementRepository(statementStore);
  const cedenteStore = createInMemoryCedenteAccountStore();
  const outbox = createInMemoryOutbox();
  const reconRepo = createInMemoryReconciliationRepository(
    {
      payables: new Map(),
      statements: statementStore,
    },
    outbox.port,
  );
  const record = recordManualEntry({
    reconciliationRepo: reconRepo,
    statements: statementRepo,
    cedenteStore,
    periods: createInMemoryReconciliationPeriodStore(),
    clock: ClockReal(),
  });
  return {
    account: account.value,
    cedenteStore,
    statementRepo,
    outbox,
    record,
    transactionIds: statement.transactions.map((t) => String(t.id)),
  };
};

describe('financial/application/use-cases/record-manual-entry', () => {
  it('CA3: cria ManualEntry, transação → Reconciled, evento ManualEntryRecorded', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    await w.cedenteStore.save(w.account);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');

    const r = await w.record({
      transactionId: txId,
      type: 'FeePenaltyInterest',
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;
    assert.match(String(r.value.reconciliationId), /^[0-9a-f-]{36}$/);
    assert.match(String(r.value.manualEntryId), /^[0-9a-f-]{36}$/);

    const tx = await w.statementRepo.findTransaction(txId);
    assert.equal(tx.ok && tx.value?.transaction.reconciliationStatus === 'Reconciled', true);
    assert.equal(
      w.outbox.all().some((e) => e.type === 'ManualEntryRecorded'),
      true,
    );
  });

  it('CA3: transação já conciliada → transaction-already-reconciled', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    await w.cedenteStore.save(w.account);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');
    await w.record({ transactionId: txId, type: 'FeePenaltyInterest', reconciledBy: 'u1' });
    const again = await w.record({
      transactionId: txId,
      type: 'FeePenaltyInterest',
      reconciledBy: 'u1',
    });
    assert.equal(again.ok, false);
    if (!again.ok) assert.equal(again.error, 'transaction-already-reconciled');
  });

  it('CA3: conta inexistente → cedente-account-not-found', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    // NÃO salva a conta → findById null → cedente-account-not-found.
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');
    const r = await w.record({ transactionId: txId, type: 'Payment', reconciledBy: 'u1' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'cedente-account-not-found');
  });

  it('CA3: guard FR-015 — conta encerrada (Closed) → account-closed', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    const closed = closeCedente(w.account);
    if (!closed.ok) throw new Error('setup: close');
    await w.cedenteStore.save(closed.value);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');
    const r = await w.record({ transactionId: txId, type: 'Payment', reconciledBy: 'u1' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'account-closed');
  });
});

describe('financial/application/use-cases/confirm-batch', () => {
  it('CA4: N transações + template → N conciliações ManualEntry', async () => {
    const w = buildWorld([txOf('f0', 1000), txOf('f1', 2000)]);
    await w.cedenteStore.save(w.account);
    const batch = confirmBatch({ record: w.record });
    const r = await batch({
      transactionIds: w.transactionIds,
      template: { type: 'Payment', description: 'lote tarifas' },
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (r.ok) {
      assert.equal(r.value.created, 2);
      assert.equal(r.value.reconciliationIds.length, 2);
      assert.equal(r.value.failed.length, 0);
    }
  });

  it('CA4: best-effort — falha isolada não aborta o lote; reportada em failed', async () => {
    const w = buildWorld([txOf('f0', 1000), txOf('f1', 2000)]);
    await w.cedenteStore.save(w.account);
    const tx0 = w.transactionIds[0];
    if (tx0 === undefined) throw new Error('setup');
    // Concilia tx0 antes → no lote ela falha (transaction-already-reconciled); tx1 ainda é criada.
    await w.record({ transactionId: tx0, type: 'Payment', reconciledBy: 'u1' });

    const batch = confirmBatch({ record: w.record });
    const r = await batch({
      transactionIds: w.transactionIds,
      template: { type: 'Payment' },
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (r.ok) {
      assert.equal(r.value.created, 1);
      assert.equal(r.value.failed.length, 1);
      assert.equal(r.value.failed[0]?.transactionId, tx0);
      assert.equal(r.value.failed[0]?.error, 'transaction-already-reconciled');
    }
  });

  it('CA4: lote vazio → empty-batch', async () => {
    const w = buildWorld([txOf('f0', 1000)]);
    const batch = confirmBatch({ record: w.record });
    const r = await batch({
      transactionIds: [],
      template: { type: 'Payment' },
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'empty-batch');
  });
});

describe('financial/application/use-cases/record-manual-entry — realocação (#143)', () => {
  const destAccount = () => {
    const id = CedenteAccountId.generate();
    const acc = createCedente({
      id,
      bankCode: '341',
      agency: '4321',
      accountNumber: '112233',
      accountDigit: '2',
      convenio: '8888888',
      document: '98765432000199',
    });
    if (!acc.ok) throw new Error('setup: dest cedente');
    return acc.value;
  };

  it('CA1: Transfer com conta de destino válida → ok', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    await w.cedenteStore.save(w.account);
    const dest = destAccount();
    await w.cedenteStore.save(dest);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');
    const r = await w.record({
      transactionId: txId,
      type: 'Transfer',
      destinationAccountRef: String(dest.id),
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true, JSON.stringify(r));
  });

  it('CA1: Transfer com destino = origem → destination-same-as-source', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    await w.cedenteStore.save(w.account);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');
    const r = await w.record({
      transactionId: txId,
      type: 'Transfer',
      destinationAccountRef: String(w.account.id),
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'destination-same-as-source');
  });

  it('CA1: Transfer com destino inexistente → destination-account-not-found', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    await w.cedenteStore.save(w.account);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');
    const ghost = CedenteAccountId.generate();
    const r = await w.record({
      transactionId: txId,
      type: 'Transfer',
      destinationAccountRef: String(ghost),
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'destination-account-not-found');
  });

  it('CA2: Investment com productLabel → ok', async () => {
    const w = buildWorld([txOf('f0', 2500)]);
    await w.cedenteStore.save(w.account);
    const txId = w.transactionIds[0];
    if (txId === undefined) throw new Error('setup');
    const r = await w.record({
      transactionId: txId,
      type: 'Investment',
      productLabel: 'CDB Banco X',
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true, JSON.stringify(r));
  });
});
