// W0 RED (#125) — domínio do fechamento de período (US6). CA1–CA3. Domínio puro, gate.

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr } from '#src/shared/index.ts';
import * as ReconciliationPeriodId from '#src/modules/financial/domain/reconciliation/reconciliation-period-id.ts';
// W0 RED: o domínio do período ainda não existe.
import { closePeriod } from '#src/modules/financial/domain/reconciliation/period.ts';

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
