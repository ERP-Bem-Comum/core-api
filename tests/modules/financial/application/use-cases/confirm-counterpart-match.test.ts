/**
 * W0 RED — FIN-COUNTERPART-MATCH (US2 · spec 029 · #269). Application: `confirmCounterpartMatch` —
 * ao confirmar o casamento transação real de B × contrapartida, concilia a perna de B (ManualEntry
 * Transfer, simétrica à perna A), consome a contrapartida (Matched) e vincula A↔B, tudo atômico.
 * RED por inexistência do use-case + do método `confirmCounterpartMatch` no repo.
 *
 * CA2: confirmar → duas pernas conciliadas e vinculadas, 0 duplicata, contrapartida Matched.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
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
import { createInMemoryCedenteAccountStore } from '#src/modules/financial/adapters/persistence/repos/cedente-account-store.in-memory.ts';
import { createInMemoryReconciliationPeriodStore } from '#src/modules/financial/adapters/persistence/repos/reconciliation-period-store.in-memory.ts';
import { createInMemoryExpectedCounterpartStore } from '#src/modules/financial/adapters/persistence/repos/expected-counterpart-store.in-memory.ts';
import { createInMemoryReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import { confirmCounterpartMatch } from '#src/modules/financial/application/use-cases/confirm-counterpart-match.ts';

const D = new Date('2026-07-01T00:00:00.000Z');
const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};
const creditTx = (raw: string, valueCents: number): ParsedTransaction => ({
  fitid: fitidOf(raw),
  date: D,
  movement: 'Credit',
  entryType: 'TED',
  payeeName: 'TRANSFERENCIA',
  memo: 'transf',
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

const buildWorld = async (
  counterpartType: 'Transfer' | 'Investment' | 'Redemption' = 'Transfer',
  productLabel: string | null = null,
) => {
  const accountB = cedente('112233');
  const originAccountA = CedenteAccountId.generate();
  const imported = importStatement(
    {
      debitAccountRef: String(accountB.id),
      period: { start: D, end: D },
      file: { name: 'b.ofx', format: 'OFX', hash: 'hB' },
      openingBalanceCents: 0,
      closingBalanceCents: 0,
      transactions: [creditTx('fB', 150000)],
      occurredAt: D,
    },
    new Set(),
  );
  if (!imported.ok) throw new Error('setup: importStatement');
  const statement = imported.value.statement;
  const statementStore: BankStatementStore = new Map([[statement.id, statement]]);
  const statementRepo = createInMemoryBankStatementRepository(statementStore);

  const cedenteStore = createInMemoryCedenteAccountStore();
  await cedenteStore.save(accountB);

  const counterpartMap = new Map<string, ExpectedCounterpartT>();
  const counterpartStore = createInMemoryExpectedCounterpartStore(counterpartMap);
  const created = ExpectedCounterpart.create({
    id: ExpectedCounterpartId.generate(),
    destinationAccountRef: accountB.id,
    originAccountRef: originAccountA,
    originReconciliationRef: ReconciliationId.generate(),
    originTransactionRef: newUuid(),
    // #428: a contrapartida carrega o tipo real (Transfer/Investment/Redemption) + o productLabel da
    // operação de origem (nulo para Transfer; preenchido para Investment/Redemption).
    type: counterpartType,
    productLabel,
    originMovement: 'Debit',
    valueCents: 150000n,
    expectedDate: D,
  });
  if (!created.ok) throw new Error('setup: counterpart');
  await counterpartStore.save(created.value.counterpart);

  const reconRepo = createInMemoryReconciliationRepository(
    { payables: new Map(), statements: statementStore, expectedCounterparts: counterpartMap },
    createInMemoryOutbox().port,
  );
  const confirm = confirmCounterpartMatch({
    statements: statementRepo,
    cedenteStore,
    periods: createInMemoryReconciliationPeriodStore(),
    expectedCounterpartStore: counterpartStore,
    reconciliationRepo: reconRepo,
    clock: ClockReal(),
  });
  const txId = statement.transactions[0];
  if (txId === undefined) throw new Error('setup: tx');
  return {
    confirm,
    counterpartStore,
    statementStore,
    reconRepo,
    accountBId: accountB.id,
    txId: String(txId.id),
    counterpartId: created.value.counterpart.id,
  };
};

describe('financial/application — confirmCounterpartMatch (US2 · #269)', () => {
  it('CA2: confirmar consome a contrapartida (Matched) + concilia a transação de B + 0 duplicata', async () => {
    const w = await buildWorld();

    const r = await w.confirm({
      transactionId: w.txId,
      counterpartId: String(w.counterpartId),
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true, JSON.stringify(r));

    // contrapartida consumida (Matched, grava a transação real)
    const cp = await w.counterpartStore.findById(w.counterpartId);
    assert.equal(cp.ok && cp.value?.status === 'Matched', true);
    if (cp.ok && cp.value) assert.equal(cp.value.matchedTransactionRef, w.txId);

    // transação de B conciliada (Pending → Reconciled)
    const statement = [...w.statementStore.values()][0]!;
    const tx = statement.transactions.find((t) => String(t.id) === w.txId)!;
    assert.equal(tx.reconciliationStatus, 'Reconciled', 'perna B conciliada');

    // 0 duplicata: a conta B não tem mais pendentes (a única contrapartida virou Matched)
    const pending = await w.counterpartStore.listPendingByAccount(w.accountBId);
    assert.equal(pending.ok && pending.value.length === 0, true, 'contrapartida saiu de Pending');
  });

  it('contrapartida inexistente → counterpart-not-found', async () => {
    const w = await buildWorld();
    const r = await w.confirm({
      transactionId: w.txId,
      counterpartId: newUuid(),
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'counterpart-not-found');
  });

  it('CA4(#428): perna espelho B nasce com o tipo REAL da contrapartida (Investment), não Transfer fixo', async () => {
    // Contrapartida Investment em B. Ao confirmar o match, a perna B (ManualEntry) deve carregar o
    // tipo real da contrapartida — hoje `confirm-counterpart-match.ts:122` crava `type:'Transfer'`.
    const w = await buildWorld('Investment', 'CDB Banco X');

    const r = await w.confirm({
      transactionId: w.txId,
      counterpartId: String(w.counterpartId),
      reconciledBy: 'u1',
    });
    assert.equal(r.ok, true, JSON.stringify(r));
    if (!r.ok) return;

    // A perna B fica registrada como Reconciliation ManualEntry; seu `manualEntry.type` deve espelhar
    // o tipo da contrapartida (Investment), não o 'Transfer' fixo.
    const legB = await w.reconRepo.findById(r.value.reconciliationId);
    assert.equal(legB.ok, true, JSON.stringify(legB));
    if (!legB.ok || legB.value === null) return;
    assert.equal(
      legB.value.manualEntry?.type,
      'Investment',
      'perna espelho B herda o tipo real da contrapartida',
    );
    // Trava contra o remendo (placeholder): a perna B carrega o productLabel REAL da origem, não vazio.
    assert.equal(
      legB.value.manualEntry?.productLabel,
      'CDB Banco X',
      'perna espelho B herda o productLabel real (não placeholder)',
    );
  });
});
