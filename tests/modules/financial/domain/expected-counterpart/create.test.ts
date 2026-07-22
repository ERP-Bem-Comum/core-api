/**
 * W0 RED — FIN-COUNTERPART-INVESTMENT-REDEMPTION (#428). Domínio: `ExpectedCounterpart.create` passa a
 * RECEBER e PROPAGAR o `type` (Transfer | Investment | Redemption) — hoje ignora o input e hardcoda
 * `type:'Transfer'` (`expected-counterpart.ts:50`). O movimento continua agnóstico ao tipo
 * (`opposite(originMovement)`); muda só a propagação do rótulo do tipo ao agregado.
 *
 * RED por: `create` não aceita `type` no input e crava 'Transfer' → as asserções de Investment/Redemption
 * (`c.type === 'Investment' | 'Redemption'`) falham. Transfer + validações continuam verdes (não-regressão).
 *
 * CA(#269): valor>0, destino≠origem, status Pending, movement OPOSTO ao da origem, evento TransferCounterpartCreated.
 * CA(#428): `type` do input propaga para o agregado (Transfer/Investment/Redemption).
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
  // #428: `create` passa a receber o tipo do lançamento; default Transfer p/ os casos legados.
  type: 'Transfer',
  originMovement: 'Debit',
  valueCents: 150000n,
  expectedDate: EXPECTED_DATE,
  ...over,
});

describe('financial/domain — ExpectedCounterpart.create (Transfer/Investment/Redemption · #428)', () => {
  it('CA(#269): cria contrapartida Pending com movement oposto (origem Debit → Credit) + evento', () => {
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

  it('CA(#428): Investment → propaga type=Investment ao agregado (movement oposto agnóstico)', () => {
    const r = ExpectedCounterpart.create(
      baseInput({ type: 'Investment', originMovement: 'Debit' }),
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;

    const c = r.value.counterpart;
    assert.equal(c.type, 'Investment', 'create propaga o tipo do input (não crava Transfer)');
    assert.equal(c.movement, 'Credit', 'oposto ao Debit da origem — agnóstico ao tipo');
    assert.equal(c.status, 'Pending');
  });

  it('CA(#428): Redemption → propaga type=Redemption (origem Credit → movement Debit)', () => {
    const r = ExpectedCounterpart.create(
      baseInput({ type: 'Redemption', originMovement: 'Credit' as Movement }),
    );
    assert.equal(r.ok, true);
    if (!r.ok) return;

    const c = r.value.counterpart;
    assert.equal(c.type, 'Redemption', 'create propaga o tipo do input');
    assert.equal(c.movement, 'Debit', 'oposto ao Credit da origem');
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
