/**
 * W0 RED — FIN-COUNTERPART-UNDO (US3 · spec 029 · #269). Application: `undoReconciliation` da perna de
 * ORIGEM (A) passa a tratar a contrapartida em B. Fluxo real via use-cases (record → [confirm] → undo).
 * RED por o undo ainda não conhecer a contrapartida.
 *
 * CA1: undo origem com contrapartida Pending → Discarded (nada órfão em B).
 * CA2: undo origem com contrapartida Matched → volta a Pending + perna B desfeita (tx B re-conciliável).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import { create as createCedente } from '#src/modules/financial/domain/cedente/cedente-account.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import type { ParsedTransaction, Movement } from '#src/modules/financial/domain/statement/types.ts';
import {
  createInMemoryBankStatementRepository,
  type BankStatementStore,
} from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { createInMemoryExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.in-memory.ts';
import { createInMemoryReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import type { ExpectedCounterpart as ExpectedCounterpartT } from '#src/modules/financial/domain/expected-counterpart/types.ts';
import { recordManualEntry } from '#src/modules/financial/application/use-cases/record-manual-entry.ts';
import { confirmCounterpartMatch } from '#src/modules/financial/application/use-cases/confirm-counterpart-match.ts';
import { undoReconciliation } from '#src/modules/financial/application/use-cases/undo-reconciliation.ts';

const D = new Date('2026-07-01T00:00:00.000Z');
const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};
const txOf = (raw: string, movement: Movement, valueCents: number): ParsedTransaction => ({
  fitid: fitidOf(raw),
  date: D,
  movement,
  entryType: 'TED',
  payeeName: 'TRANSF',
  memo: 't',
  valueCents,
  balanceAfterCents: 0,
});
const cedente = (acc: string) => {
  const r = createCedente({
    id: CedenteAccountId.generate(),
    bankCode: '341',
    agency: '1234',
    accountNumber: acc,
    accountDigit: '1',
    convenio: '9999999',
    document: '12345678000190',
  });
  if (!r.ok) throw new Error('setup: cedente');
  return r.value;
};
const seedStatement = (accountId: string, tx: ParsedTransaction) => {
  const r = importStatement(
    {
      debitAccountRef: accountId,
      period: { start: D, end: D },
      file: { name: 'e.ofx', format: 'OFX', hash: `h-${accountId}` },
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      transactions: [tx],
      occurredAt: D,
    },
    new Set(),
  );
  if (!r.ok) throw new Error('setup: importStatement');
  return r.value.statement;
};

const buildWorld = async () => {
  const accountA = cedente('111111');
  const accountB = cedente('222222');
  const stmtA = seedStatement(String(accountA.id), txOf('fA', 'Debit', 150000));
  const stmtB = seedStatement(String(accountB.id), txOf('fB', 'Credit', 150000));
  const statementStore: BankStatementStore = new Map([
    [stmtA.id, stmtA],
    [stmtB.id, stmtB],
  ]);
  const statementRepo = createInMemoryBankStatementRepository(statementStore);
  const cedenteStore = createInMemoryCedenteAccountStore();
  await cedenteStore.save(accountA);
  await cedenteStore.save(accountB);
  const cpMap = new Map<string, ExpectedCounterpartT>();
  const counterpartStore = createInMemoryExpectedCounterpartStore(cpMap);
  const reconRepo = createInMemoryReconciliationRepository({
    payables: new Map(),
    statements: statementStore,
    expectedCounterparts: cpMap,
  });
  const periods = createInMemoryReconciliationPeriodStore();
  const clock = ClockReal();

  const record = recordManualEntry({
    reconciliationRepo: reconRepo,
    statements: statementRepo,
    cedenteStore,
    periods,
    clock,
    expectedCounterpartStore: counterpartStore,
  });
  const confirmCp = confirmCounterpartMatch({
    statements: statementRepo,
    cedenteStore,
    periods,
    expectedCounterpartStore: counterpartStore,
    reconciliationRepo: reconRepo,
    clock,
  });
  const undoRec = undoReconciliation({
    reconciliationRepo: reconRepo,
    statements: statementRepo,
    periods,
    clock,
    expectedCounterpartStore: counterpartStore,
  });

  const txA = stmtA.transactions[0];
  const txB = stmtB.transactions[0];
  if (txA === undefined || txB === undefined) throw new Error('setup: tx');
  return {
    record,
    confirmCp,
    undoRec,
    counterpartStore,
    statementStore,
    accountB,
    txA: String(txA.id),
    txB: String(txB.id),
  };
};

const bStatus = (store: BankStatementStore, txId: string) => {
  for (const s of store.values()) {
    const t = s.transactions.find((x) => String(x.id) === txId);
    if (t !== undefined) return t.reconciliationStatus;
  }
  return undefined;
};

describe('financial/application — undoReconciliation trata a contrapartida (US3 · #269)', () => {
  it('CA1: undo origem com contrapartida Pending → Discarded', async () => {
    const w = await buildWorld();
    const rec = await w.record({
      transactionId: w.txA,
      type: 'Transfer',
      destinationAccountRef: String(w.accountB.id),
      reconciledBy: 'u1',
    });
    assert.equal(rec.ok, true, JSON.stringify(rec));
    if (!rec.ok) return;

    const pending = await w.counterpartStore.listPendingByAccount(w.accountB.id);
    assert.equal(pending.ok && pending.value.length === 1, true);
    if (!pending.ok) return;
    const cpId = pending.value[0]!.id;

    const undone = await w.undoRec({
      reconciliationId: String(rec.value.reconciliationId),
      undoneBy: 'u1',
    });
    assert.equal(undone.ok, true, JSON.stringify(undone));

    const cp = await w.counterpartStore.findById(cpId);
    assert.equal(cp.ok && cp.value?.status === 'Discarded', true, 'contrapartida descartada');
    const stillPending = await w.counterpartStore.listPendingByAccount(w.accountB.id);
    assert.equal(stillPending.ok && stillPending.value.length === 0, true, 'nada órfão em B');
  });

  it('CA2: undo origem com contrapartida Matched → reaberta Pending + perna B desfeita', async () => {
    const w = await buildWorld();
    const rec = await w.record({
      transactionId: w.txA,
      type: 'Transfer',
      destinationAccountRef: String(w.accountB.id),
      reconciledBy: 'u1',
    });
    assert.equal(rec.ok, true);
    if (!rec.ok) return;
    const pending = await w.counterpartStore.listPendingByAccount(w.accountB.id);
    if (!pending.ok || pending.value[0] === undefined) throw new Error('setup: pending');
    const cpId = pending.value[0].id;

    const confirmed = await w.confirmCp({
      transactionId: w.txB,
      counterpartId: String(cpId),
      reconciledBy: 'u1',
    });
    assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
    assert.equal(bStatus(w.statementStore, w.txB), 'Reconciled', 'B conciliada antes do undo');

    const undone = await w.undoRec({
      reconciliationId: String(rec.value.reconciliationId),
      undoneBy: 'u1',
    });
    assert.equal(undone.ok, true, JSON.stringify(undone));

    const cp = await w.counterpartStore.findById(cpId);
    assert.equal(cp.ok && cp.value?.status === 'Pending', true, 'contrapartida reaberta');
    if (cp.ok && cp.value) assert.equal(cp.value.matchedTransactionRef, null);
    assert.equal(bStatus(w.statementStore, w.txB), 'Pending', 'perna B desfeita (re-conciliável)');
  });
});
