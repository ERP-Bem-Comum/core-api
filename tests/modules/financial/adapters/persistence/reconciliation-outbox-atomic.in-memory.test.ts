import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, err, isErr } from '#src/shared/index.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as Fitid from '#src/modules/financial/domain/statement/fitid.ts';
import { importStatement } from '#src/modules/financial/domain/statement/bank-statement.ts';
import {
  confirm as domainConfirm,
  undo as domainUndo,
} from '#src/modules/financial/domain/reconciliation/reconciliation.ts';
import type { ParsedTransaction } from '#src/modules/financial/domain/statement/types.ts';
import type {
  FinancialOutbox,
  OutboxAppendError,
} from '#src/modules/financial/application/ports/outbox.ts';
import {
  createInMemoryReconciliationRepository,
  type ReconciliationStore,
} from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import type { BankStatementStore } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import type {
  PayableStore,
  PayableRecord,
} from '#src/modules/financial/adapters/persistence/repos/payable-reconciliation-view.in-memory.ts';

// CA1/CA3 (#127, Fatia B) — paridade in-memory da atomicidade conciliação+evento provada no Drizzle
// (Docker). O use-case encaminha os eventos PARA DENTRO de `repo.confirm`/`confirmManualEntry`/`undo`;
// uma falha no append do outbox (na unit-of-work) reverte TUDO — título/transação preservam o estado.

const D = new Date('2024-05-18T00:00:00.000Z');

const failingOutbox: FinancialOutbox = {
  append: (): Promise<Result<void, OutboxAppendError>> =>
    Promise.resolve(err('outbox-append-failed')),
};

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};

const buildStores = () => {
  const cedenteId = CedenteAccountId.generate();
  const txs: readonly ParsedTransaction[] = [
    {
      fitid: fitidOf('f-tx'),
      date: D,
      movement: 'Debit',
      entryType: 'TED',
      payeeName: 'FORNECEDOR X',
      memo: 'pagamento',
      valueCents: 1000,
      balanceAfterCents: 0,
    },
  ];
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
  const tx = statement.transactions[0];
  if (tx === undefined) throw new Error('setup: transaction');

  const statements: BankStatementStore = new Map([[statement.id, statement]]);
  const payableId = PayableId.generate();
  const payableRecord: PayableRecord = {
    id: String(payableId),
    documentId: String(PayableId.generate()),
    status: 'Paid',
    valueCents: 1000,
    dueDate: D,
    paymentMethod: 'PIX',
  };
  const payables: PayableStore = new Map([[String(payableId), payableRecord]]);
  return { statements, payables, transactionId: tx.id, payableId };
};

const buildRecon = (
  transactionId: ReturnType<typeof buildStores>['transactionId'],
  payableId: ReturnType<typeof buildStores>['payableId'],
) => {
  const out = domainConfirm({
    reconciliationId: ReconciliationId.generate(),
    transactionId,
    transactionValueCents: 1000,
    payables: [{ id: payableId, status: 'Paid', valueCents: 1000 }],
    reconciledBy: 'u1',
    occurredAt: D,
  });
  if (!out.ok) throw new Error('setup: domainConfirm');
  return out.value;
};

const txStatusOf = (statements: BankStatementStore): string | undefined =>
  [...statements.values()][0]?.transactions[0]?.reconciliationStatus;

describe('financial/adapters — atomicidade conciliação+outbox (in-memory)', () => {
  it('CA3: falha no outbox durante confirm reverte (título Paid, transação Pending, sem conciliação)', async () => {
    const { statements, payables, transactionId, payableId } = buildStores();
    const { reconciliation, events } = buildRecon(transactionId, payableId);
    const repo = createInMemoryReconciliationRepository({ payables, statements }, failingOutbox);

    const r = await repo.confirm(reconciliation, transactionId, events);

    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'reconciliation-repository-failure');
    // Nada mutado: título segue Paid, transação Pending, conciliação não persistida.
    assert.equal(payables.get(String(payableId))?.status, 'Paid');
    assert.equal(txStatusOf(statements), 'Pending');
    const found = await repo.findById(reconciliation.id);
    assert.equal(found.ok && found.value === null, true);
  });

  it('CA3: falha no outbox durante undo preserva o estado conciliado', async () => {
    const { statements, payables, transactionId, payableId } = buildStores();
    const { reconciliation } = buildRecon(transactionId, payableId);
    const reconciliations: ReconciliationStore = new Map();

    // Setup: confirma com outbox default (não tocada — sem events) → estado Reconciled.
    const setupRepo = createInMemoryReconciliationRepository({
      reconciliations,
      payables,
      statements,
    });
    const okConfirm = await setupRepo.confirm(reconciliation, transactionId);
    assert.equal(okConfirm.ok, true);
    assert.equal(payables.get(String(payableId))?.status, 'Reconciled');
    assert.equal(txStatusOf(statements), 'Reconciled');

    // Undo com outbox que falha → rollback: estado conciliado preservado.
    const undone = domainUndo(reconciliation, { undoneBy: 'u2', occurredAt: D });
    if (!undone.ok) throw new Error('setup: domainUndo');
    const repo = createInMemoryReconciliationRepository(
      { reconciliations, payables, statements },
      failingOutbox,
    );
    const r = await repo.undo(undone.value.reconciliation, undone.value.events);

    assert.equal(isErr(r), true);
    assert.equal(payables.get(String(payableId))?.status, 'Reconciled');
    assert.equal(txStatusOf(statements), 'Reconciled');
  });
});
