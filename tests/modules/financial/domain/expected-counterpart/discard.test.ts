/**
 * W0 RED — FIN-COUNTERPART-UNDO (US3 · spec 029 · #269). Domínio: `ExpectedCounterpart.discard` e
 * `reopen` — desfazer a conciliação de origem trata a contrapartida. RED por inexistência das operações.
 *
 * CA1: discard numa Pending → Discarded + TransferCounterpartDiscarded.
 * CA2: reopen numa Matched → Pending (limpa matchedTransactionRef).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as ExpectedCounterpartId from '#src/modules/financial/domain/expected-counterpart/expected-counterpart-id.ts';
import * as ExpectedCounterpart from '#src/modules/financial/domain/expected-counterpart/expected-counterpart.ts';

const pendingCounterpart = () => {
  const r = ExpectedCounterpart.create({
    id: ExpectedCounterpartId.generate(),
    destinationAccountRef: CedenteAccountId.generate(),
    originAccountRef: CedenteAccountId.generate(),
    originReconciliationRef: ReconciliationId.generate(),
    originTransactionRef: 'tx-A-1',
    originMovement: 'Debit',
    valueCents: 150000n,
    expectedDate: new Date('2026-07-01'),
  });
  if (!r.ok) throw new Error('setup: create');
  return r.value.counterpart;
};
const matchedCounterpart = (ref = 'tx-B-1') => {
  const m = ExpectedCounterpart.match(pendingCounterpart(), ref);
  if (!m.ok) throw new Error('setup: match');
  return m.value.counterpart;
};

describe('financial/domain — ExpectedCounterpart.discard/reopen (#269 · US3)', () => {
  it('CA1: discard numa contrapartida Pending → Discarded + evento', () => {
    const r = ExpectedCounterpart.discard(pendingCounterpart());
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.counterpart.status, 'Discarded');
    const ev = r.value.events[0];
    assert.ok(ev !== undefined);
    assert.equal(ev.type, 'TransferCounterpartDiscarded');
    if (ev.type === 'TransferCounterpartDiscarded') assert.equal(ev.reason, 'undo-origin');
  });

  it('discard numa contrapartida não-Pending → counterpart-not-pending', () => {
    const r = ExpectedCounterpart.discard(matchedCounterpart());
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'counterpart-not-pending');
  });

  it('CA2: reopen numa contrapartida Matched → Pending (limpa matchedTransactionRef)', () => {
    const r = ExpectedCounterpart.reopen(matchedCounterpart('tx-B-9'));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.counterpart.status, 'Pending');
    assert.equal(r.value.counterpart.matchedTransactionRef, null, 'reabre para novo match');
  });

  it('reopen numa contrapartida não-Matched → counterpart-not-matched', () => {
    const r = ExpectedCounterpart.reopen(pendingCounterpart());
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'counterpart-not-matched');
  });
});
