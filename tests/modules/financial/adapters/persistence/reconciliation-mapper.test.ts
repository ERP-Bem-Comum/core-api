import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { confirmManualEntry } from '#src/modules/financial/domain/reconciliation/manual-entry.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as StatementTransactionId from '#src/modules/financial/domain/statement/statement-transaction-id.ts';
import {
  reconciliationToRow,
  toDomain,
} from '#src/modules/financial/adapters/persistence/mappers/reconciliation.mapper.ts';
import type { ReconciliationRow } from '#src/modules/financial/adapters/persistence/schemas/mysql.ts';

// #191 — o rehydrator `toType` esquecia 'ManualEntry' → toDomain de uma conciliação ManualEntry
// devolvia err('invalid-reconciliation-type'), que vira 503 no lookup #175. Round-trip prova o reload.

describe('financial/adapters — reconciliation.mapper toDomain (#191)', () => {
  it('CA1: reidrata conciliação ManualEntry (round-trip) sem invalid-reconciliation-type', () => {
    const built = confirmManualEntry({
      reconciliationId: ReconciliationId.generate(),
      transactionId: StatementTransactionId.generate(),
      type: 'FeePenaltyInterest',
      valueCents: 1000,
      reconciledBy: '11111111-1111-4111-8111-111111111111',
      occurredAt: new Date('2024-05-20T12:00:00.000Z'),
    });
    assert.equal(built.ok, true, JSON.stringify(built));
    if (!built.ok) return;
    const recon = built.value.reconciliation;
    assert.equal(recon.type, 'ManualEntry');

    // Persistência ida-e-volta: linha gravada (type='ManualEntry') deve reidratar sem erro.
    const row = reconciliationToRow(recon) as ReconciliationRow;
    const back = toDomain(row, []);

    assert.equal(back.ok, true, JSON.stringify(back));
    if (back.ok) {
      assert.equal(back.value.type, 'ManualEntry');
      assert.equal(back.value.status, 'Active');
    }
  });
});
