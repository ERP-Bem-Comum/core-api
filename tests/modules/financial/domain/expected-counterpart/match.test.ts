/**
 * W0 RED — FIN-COUNTERPART-MATCH (US2 · spec 029 · #269). Domínio: `ExpectedCounterpart.match` —
 * consome a contrapartida esperada quando o extrato real da conta de destino chega. RED por
 * inexistência da operação `match` no agregado.
 *
 * CA2: Pending → Matched, grava matchedTransactionRef, emite TransferCounterpartMatched.
 * CA3: match numa contrapartida não-Pending → counterpart-not-pending.
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
  if (!r.ok) throw new Error('setup: create counterpart');
  return r.value.counterpart;
};

describe('financial/domain — ExpectedCounterpart.match (#269 · US2)', () => {
  it('CA2: match numa contrapartida Pending → Matched + matchedTransactionRef + evento', () => {
    const r = ExpectedCounterpart.match(pendingCounterpart(), 'tx-B-real-1');
    assert.equal(r.ok, true);
    if (!r.ok) return;

    const c = r.value.counterpart;
    assert.equal(c.status, 'Matched');
    assert.equal(c.matchedTransactionRef, 'tx-B-real-1', 'grava a transação real que a consumiu');

    const ev = r.value.events[0];
    assert.ok(ev !== undefined, 'emite evento');
    assert.equal(ev.type, 'TransferCounterpartMatched');
  });

  it('CA3: match numa contrapartida já Matched → counterpart-not-pending', () => {
    const first = ExpectedCounterpart.match(pendingCounterpart(), 'tx-1');
    assert.equal(first.ok, true);
    if (!first.ok) return;

    const second = ExpectedCounterpart.match(first.value.counterpart, 'tx-2');
    assert.equal(second.ok, false, 'terminal: não casa duas vezes');
    if (second.ok) return;
    assert.equal(second.error, 'counterpart-not-pending');
  });
});
