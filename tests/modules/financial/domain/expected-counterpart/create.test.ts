/**
 * W0 RED — FIN-COUNTERPART-CREATE (US1 · spec 029 · #269). Domínio: `ExpectedCounterpart.create` —
 * contrapartida esperada na conta de destino de uma transferência A→B. RED por inexistência do agregado.
 *
 * CA3: valor>0, destino≠origem, status Pending, movement OPOSTO ao da origem, evento TransferCounterpartCreated.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as CedenteAccountId from '#src/modules/financial/domain/cedente/cedente-account-id.ts';
import * as ReconciliationId from '#src/modules/financial/domain/reconciliation/reconciliation-id.ts';
import * as ExpectedCounterpartId from '#src/modules/financial/domain/expected-counterpart/expected-counterpart-id.ts';
import * as ExpectedCounterpart from '#src/modules/financial/domain/expected-counterpart/expected-counterpart.ts';
import type { Movement } from '#src/modules/financial/domain/statement/types.ts';

const EXPECTED_DATE = new Date('2026-07-01');

const baseInput = (
  over: Partial<ExpectedCounterpart.CreateExpectedCounterpartInput> = {},
): ExpectedCounterpart.CreateExpectedCounterpartInput => ({
  id: ExpectedCounterpartId.generate(),
  destinationAccountRef: CedenteAccountId.generate(),
  originAccountRef: CedenteAccountId.generate(),
  originReconciliationRef: ReconciliationId.generate(),
  originTransactionRef: 'tx-A-1',
  originMovement: 'Debit',
  valueCents: 150000n,
  expectedDate: EXPECTED_DATE,
  ...over,
});

describe('financial/domain — ExpectedCounterpart.create (#269)', () => {
  it('CA3: cria contrapartida Pending com movement oposto (origem Debit → Credit) + evento', () => {
    const r = ExpectedCounterpart.create(baseInput({ originMovement: 'Debit' }));
    assert.equal(r.ok, true);
    if (!r.ok) return;

    const c = r.value.counterpart;
    assert.equal(c.status, 'Pending');
    assert.equal(c.movement, 'Credit', 'destino espera a perna oposta da origem');
    assert.equal(c.valueCents, 150000n, 'valor espelha a origem');
    assert.equal(c.matchedTransactionRef, null);
    assert.equal(c.type, 'Transfer');

    const ev = r.value.events[0];
    assert.ok(ev !== undefined, 'emite evento');
    assert.equal(ev.type, 'TransferCounterpartCreated');
  });

  it('movement oposto na direção inversa (origem Credit → Debit)', () => {
    const r = ExpectedCounterpart.create(baseInput({ originMovement: 'Credit' as Movement }));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.value.counterpart.movement, 'Debit');
  });

  it('valor não-positivo → counterpart-value-invalid', () => {
    const r = ExpectedCounterpart.create(baseInput({ valueCents: 0n }));
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'counterpart-value-invalid');
  });

  it('destino == origem → counterpart-same-account', () => {
    const same = CedenteAccountId.generate();
    const r = ExpectedCounterpart.create(
      baseInput({ destinationAccountRef: same, originAccountRef: same }),
    );
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.error, 'counterpart-same-account');
  });
});
