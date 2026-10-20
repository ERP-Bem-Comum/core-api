// #406 — conciliar e desfazer a conciliação deixam marco na trilha do TÍTULO (in-memory).
//
// Paridade com o adapter Drizzle (provado contra MySQL em `reconciliation-repository.drizzle-mysql`):
// uma entry por título, status anterior e seguinte, autor do agregado, motivo no desfazimento.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
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
import type { FinancialTimelineEntry } from '#src/modules/financial/domain/timeline/types.ts';
import { createInMemoryReconciliationRepository } from '#src/modules/financial/adapters/persistence/repos/reconciliation-repository.in-memory.ts';
import type { TimelineStore } from '#src/modules/financial/adapters/persistence/repos/timeline-repository.in-memory.ts';
import type { BankStatementStore } from '#src/modules/financial/adapters/persistence/repos/bank-statement-repository.in-memory.ts';
import type {
  PayableStore,
  PayableRecord,
} from '#src/modules/financial/adapters/persistence/repos/payable-reconciliation-view.in-memory.ts';

const D = new Date('2026-10-01T00:00:00.000Z');
const UNDONE_AT = new Date('2026-10-02T00:00:00.000Z');
const RECONCILER = '44444444-4444-4444-8444-444444444444';
const UNDOER = '55555555-5555-4555-8555-555555555555';
const DOC = '66666666-6666-4666-8666-666666666666';

const fitidOf = (raw: string) => {
  const f = Fitid.fromNative(raw);
  if (!f.ok) throw new Error('setup: fitid');
  return f.value;
};

const setup = (reconciledBy = RECONCILER) => {
  const cedenteId = CedenteAccountId.generate();
  const txs: readonly ParsedTransaction[] = [
    {
      fitid: fitidOf('f-trail'),
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
      file: { name: 'e.ofx', format: 'OFX', hash: 'h-trail' },
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

  const payableId = PayableId.generate();
  const record: PayableRecord = {
    id: String(payableId),
    documentId: DOC,
    status: 'Paid',
    valueCents: 1000,
    dueDate: D,
    paymentMethod: 'PIX',
  };
  const payables: PayableStore = new Map([[String(payableId), record]]);
  const statements: BankStatementStore = new Map([[statement.id, statement]]);
  const timeline: TimelineStore = new Map<string, FinancialTimelineEntry[]>();
  const repo = createInMemoryReconciliationRepository({ payables, statements, timeline });

  const confirmed = domainConfirm({
    reconciliationId: ReconciliationId.generate(),
    transactionId: tx.id,
    transactionValueCents: 1000,
    payables: [{ id: payableId, status: 'Paid', valueCents: 1000 }],
    reconciledBy,
    occurredAt: D,
  });
  if (!confirmed.ok) throw new Error('setup: domainConfirm');

  return { repo, timeline, payableId, transactionId: tx.id, confirmed: confirmed.value };
};

const entriesOf = (timeline: TimelineStore): readonly FinancialTimelineEntry[] =>
  timeline.get(DOC) ?? [];

describe('#406 — trilha da conciliação (in-memory)', () => {
  it('conciliar grava PayableReconciled no título: Paid → Reconciled, autor de quem conciliou', async () => {
    const s = setup();
    const r = await s.repo.confirm(s.confirmed.reconciliation, s.transactionId, s.confirmed.events);
    assert.ok(isOk(r));

    const entries = entriesOf(s.timeline);
    assert.equal(entries.length, 1);
    const e = entries[0];
    assert.ok(e !== undefined);
    assert.equal(e.eventType, 'PayableReconciled');
    assert.deepEqual(e.target, { kind: 'Payable', id: s.payableId });
    assert.equal(String(e.actor), RECONCILER);
    assert.equal(e.reason, null);
    assert.equal(e.occurredAt.getTime(), D.getTime());
    assert.deepEqual(e.changes, [{ field: 'status', before: 'Paid', after: 'Reconciled' }]);
  });

  it('desfazer grava ReconciliationUndone: Reconciled → Paid, autor e motivo do desfazimento', async () => {
    const s = setup();
    assert.ok(
      isOk(await s.repo.confirm(s.confirmed.reconciliation, s.transactionId, s.confirmed.events)),
    );
    const undone = domainUndo(s.confirmed.reconciliation, {
      undoneBy: UNDOER,
      occurredAt: UNDONE_AT,
      reason: 'conciliado no título errado',
    });
    assert.ok(undone.ok);
    assert.ok(isOk(await s.repo.undo(undone.value.reconciliation, undone.value.events)));

    const entries = entriesOf(s.timeline);
    assert.equal(entries.length, 2, 'conciliar + desfazer: dois marcos, na ordem');
    const e = entries[1];
    assert.ok(e !== undefined);
    assert.equal(e.eventType, 'ReconciliationUndone');
    assert.deepEqual(e.target, { kind: 'Payable', id: s.payableId });
    assert.equal(String(e.actor), UNDOER);
    assert.equal(e.reason, 'conciliado no título errado');
    assert.equal(e.occurredAt.getTime(), UNDONE_AT.getTime());
    assert.deepEqual(e.changes, [{ field: 'status', before: 'Reconciled', after: 'Paid' }]);
  });

  it('autor que não é UUID (seed/ETL) vira marco sem autor — nunca trilha ilegível', async () => {
    const s = setup('etl');
    assert.ok(
      isOk(await s.repo.confirm(s.confirmed.reconciliation, s.transactionId, s.confirmed.events)),
    );
    assert.equal(entriesOf(s.timeline)[0]?.actor, null);
  });
});
