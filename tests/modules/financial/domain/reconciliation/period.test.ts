// W0 RED (#125) — domínio do fechamento de período (US6). CA1–CA3. Domínio puro, gate.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as ReconciliationPeriodId from '#src/modules/financial/domain/reconciliation/reconciliation-period-id.ts';
// W0 RED: o domínio do período ainda não existe.
import {
  closePeriod,
  reopenPeriod,
  type ReconciliationPeriod,
} from '#src/modules/financial/domain/reconciliation/period.ts';

const WHEN = new Date('2024-06-01T12:00:00.000Z');

const baseInput = (over: Partial<Parameters<typeof closePeriod>[0]> = {}) => ({
  periodId: ReconciliationPeriodId.generate(),
  debitAccountRef: '11111111-1111-4111-8111-111111111111',
  periodStart: new Date('2024-05-01T00:00:00.000Z'),
  periodEnd: new Date('2024-05-31T00:00:00.000Z'),
  hasPendingTransactions: false,
  closedBy: '99999999-9999-4999-8999-999999999999',
  occurredAt: WHEN,
  ...over,
});

describe('financial/domain/reconciliation — closePeriod (US6)', () => {
  it('CA1: período sem pendências → ReconciliationPeriod Closed + evento ReconciliationPeriodClosed', () => {
    const r = closePeriod(baseInput());
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.period.status, 'Closed');
    assert.equal(r.value.period.closedBy, '99999999-9999-4999-8999-999999999999');
    assert.equal(r.value.events.length, 1);
    assert.equal(r.value.events[0]?.type, 'ReconciliationPeriodClosed');
  });

  it('CA2: transações Pending no período → period-has-pending-transactions', () => {
    const r = closePeriod(baseInput({ hasPendingTransactions: true }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-has-pending-transactions');
  });

  it('CA3: range inválido (start > end) → invalid-period-range', () => {
    const r = closePeriod(
      baseInput({
        periodStart: new Date('2024-05-31T00:00:00.000Z'),
        periodEnd: new Date('2024-05-01T00:00:00.000Z'),
      }),
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'invalid-period-range');
  });
});

// W0 RED (#203) — reabrir período (CA5 domínio puro): Closed → Open + evento ReconciliationPeriodReopened.
const CLOSER_ID = '99999999-9999-4999-8999-999999999999';
const REOPENER_ID = '88888888-8888-4888-8888-888888888888';
const WHEN_REOPEN = new Date('2024-06-02T09:00:00.000Z');

const closedPeriod = (over: Partial<ReconciliationPeriod> = {}): ReconciliationPeriod =>
  immutable<ReconciliationPeriod>({
    id: ReconciliationPeriodId.generate(),
    debitAccountRef: '11111111-1111-4111-8111-111111111111',
    periodStart: new Date('2024-05-01T00:00:00.000Z'),
    periodEnd: new Date('2024-05-31T00:00:00.000Z'),
    status: 'Closed',
    closedAt: WHEN,
    closedBy: CLOSER_ID,
    ...over,
  });

describe('financial/domain/reconciliation — reopenPeriod (#203, US reopen)', () => {
  it('CA5: período Closed → Open com closedAt/closedBy nulos + evento ReconciliationPeriodReopened', () => {
    const current = closedPeriod();
    const r = reopenPeriod(current, { reopenedBy: REOPENER_ID, occurredAt: WHEN_REOPEN });
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.period.status, 'Open');
    assert.equal(r.value.period.closedAt, null);
    assert.equal(r.value.period.closedBy, null);
    // Identidade e range preservados.
    assert.equal(r.value.period.id, current.id);
    assert.equal(r.value.period.debitAccountRef, current.debitAccountRef);
    assert.equal(r.value.events.length, 1);
    assert.equal(r.value.events[0]?.type, 'ReconciliationPeriodReopened');
    assert.equal(r.value.events[0]?.periodId, current.id);
    assert.equal(r.value.events[0]?.occurredAt, WHEN_REOPEN);
  });

  it('CA2 (domínio): período já Open → period-not-closed (não transiciona)', () => {
    const current = closedPeriod({ status: 'Open', closedAt: null, closedBy: null });
    const r = reopenPeriod(current, { reopenedBy: REOPENER_ID, occurredAt: WHEN_REOPEN });
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'period-not-closed');
  });
});
