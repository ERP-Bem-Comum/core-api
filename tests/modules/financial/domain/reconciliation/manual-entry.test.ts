// W0 RED (#124) — domínio do lançamento manual (US5). CA1/CA2. Domínio puro, gate.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
// W0 RED: o domínio do lançamento manual ainda não existe.
import { confirmManualEntry } from '#src/modules/financial/domain/reconciliation/manual-entry.ts';

const WHEN = new Date('2024-05-20T12:00:00.000Z');

const baseInput = (valueCents: number) => ({
  reconciliationId: ReconciliationId.generate(),
  transactionId: StatementTransactionId.generate(),
  type: 'FeePenaltyInterest' as const,
  valueCents,
  categoryRef: '11111111-1111-4111-8111-111111111111',
  description: 'tarifa bancária',
  reconciledBy: '99999999-9999-4999-8999-999999999999',
  occurredAt: WHEN,
});

describe('financial/domain/reconciliation — confirmManualEntry (US5)', () => {
  it('CA1: cria Reconciliation tipo ManualEntry (sem itens) + evento ManualEntryRecorded', () => {
    const r = confirmManualEntry(baseInput(2500));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.reconciliation.type, 'ManualEntry');
    assert.equal(r.value.reconciliation.status, 'Active');
    assert.equal(r.value.reconciliation.items.length, 0);
    assert.ok(r.value.reconciliation.manualEntry, 'manualEntry no boundary');
    assert.equal(r.value.reconciliation.manualEntry?.type, 'FeePenaltyInterest');
    assert.equal(r.value.reconciliation.manualEntry?.valueCents, 2500);
    assert.equal(r.value.events.length, 1);
    assert.equal(r.value.events[0]?.type, 'ManualEntryRecorded');
  });

  it('CA2: valor não-positivo → manual-entry-value-not-positive', () => {
    const r = confirmManualEntry(baseInput(0));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'manual-entry-value-not-positive');
  });
});
