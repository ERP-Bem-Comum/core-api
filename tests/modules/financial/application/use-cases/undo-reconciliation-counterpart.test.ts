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
    reconRepo,
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

  // #450: desfazer a conciliação NA PERNA B (destino) deve REABRIR a contrapartida esperada (Matched →
  // Pending) — não deixá-la presa em Matched. A origem (A) NÃO é tocada (guard de simetria).
  it('#450: undo na perna B (destino) reabre a contrapartida e não toca a origem', async () => {
    const w = await buildWorld();
    const rec = await w.record({
      transactionId: w.txA,
      type: 'Transfer',
      destinationAccountRef: String(w.accountB.id),
      reconciledBy: 'u1',
    });
    assert.equal(rec.ok, true, JSON.stringify(rec));
    if (!rec.ok) return;
    const originReconciliationId = rec.value.reconciliationId;

    const pending = await w.counterpartStore.listPendingByAccount(w.accountB.id);
    if (!pending.ok || pending.value[0] === undefined) throw new Error('setup: pending');
    const cpId = pending.value[0].id;

    // Casa a perna B → contrapartida Matched; guarda a conciliação de B (é a que vamos desfazer).
    const confirmed = await w.confirmCp({
      transactionId: w.txB,
      counterpartId: String(cpId),
      reconciledBy: 'u1',
    });
    assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
    if (!confirmed.ok) return;
    const legBReconciliationId = confirmed.value.reconciliationId;

    // Desfaz a PERNA B (não a origem).
    const undone = await w.undoRec({
      reconciliationId: String(legBReconciliationId),
      undoneBy: 'u1',
    });
    assert.equal(undone.ok, true, JSON.stringify(undone));

    // Contrapartida VOLTA a Pending (não fica presa em Matched) e some o vínculo com a transação de B.
    const cp = await w.counterpartStore.findById(cpId);
    assert.equal(
      cp.ok && cp.value?.status === 'Pending',
      true,
      'contrapartida reaberta (não presa em Matched)',
    );
    if (cp.ok && cp.value) assert.equal(cp.value.matchedTransactionRef, null);

    // E reaparece na fila de pendentes do destino (regressão da issue #450).
    const reopened = await w.counterpartStore.listPendingByAccount(w.accountB.id);
    assert.equal(
      reopened.ok && reopened.value.some((c) => String(c.id) === String(cpId)),
      true,
      'contrapartida reaberta reaparece em listPendingByAccount(destino)',
    );

    // Perna B volta a Pending (re-conciliável); a origem A permanece intacta.
    assert.equal(bStatus(w.statementStore, w.txB), 'Pending', 'perna B desfeita (re-conciliável)');
    assert.equal(
      bStatus(w.statementStore, w.txA),
      'Reconciled',
      'origem A intacta (não tocada pelo undo de B)',
    );
    const originRec = await w.reconRepo.findById(originReconciliationId);
    assert.equal(
      originRec.ok && originRec.value?.status === 'Active',
      true,
      'conciliação de origem segue Active (guard de simetria)',
    );
  });

  // Não-regressão: conciliação sem contrapartida (nem por origem nem por destino) → undo normal.
  it('undo de conciliação sem contrapartida → undo normal (back-compat)', async () => {
    const w = await buildWorld();
    // Lançamento manual simples em A (Payment, sem destino) → NENHUMA contrapartida nasce.
    const rec = await w.record({
      transactionId: w.txA,
      type: 'Payment',
      categoryRef: '11111111-1111-4111-8111-111111111111',
      costCenterRef: '22222222-2222-4222-8222-222222222222',
      reconciledBy: 'u1',
    });
    assert.equal(rec.ok, true, JSON.stringify(rec));
    if (!rec.ok) return;
    assert.equal(bStatus(w.statementStore, w.txA), 'Reconciled', 'A conciliada antes do undo');

    const undone = await w.undoRec({
      reconciliationId: String(rec.value.reconciliationId),
      undoneBy: 'u1',
    });
    assert.equal(undone.ok, true, JSON.stringify(undone));
    assert.equal(bStatus(w.statementStore, w.txA), 'Pending', 'A desfeita (undo normal)');

    const undoneRec = await w.reconRepo.findById(rec.value.reconciliationId);
    assert.equal(undoneRec.ok && undoneRec.value?.status === 'Undone', true, 'conciliação Undone');
  });
});
