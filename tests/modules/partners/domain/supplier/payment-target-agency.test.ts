/**
 * PAR-COLLABORATOR-FIELDS — W0 (RED) — validação de agência no VO compartilhado (#40 CA3).
 *
 * DEVE FALHAR: hoje `createBankAccount` só checa `isBlank` na agência; não há regex de
 * 4 dígitos + DV opcional. GREEN quando o W1 adicionar a regra com slug `bank-agency-invalid`,
 * harmonizada com Supplier/Act (os fixtures existentes usam `0001-2` e `1234`, ambos válidos).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as PaymentTarget from '#src/modules/partners/domain/supplier/payment-target.ts';

const base = { bank: '001', accountNumber: '123456', checkDigit: '7' };

describe('createBankAccount — agência', () => {
  it('aceita 4 dígitos (1234)', () => {
    assert.equal(PaymentTarget.createBankAccount({ ...base, agency: '1234' }).ok, true);
  });

  it('aceita 4 dígitos + DV (0001-2)', () => {
    assert.equal(PaymentTarget.createBankAccount({ ...base, agency: '0001-2' }).ok, true);
  });

  it('aceita 4 dígitos + DV colado (00012)', () => {
    assert.equal(PaymentTarget.createBankAccount({ ...base, agency: '00012' }).ok, true);
  });

  it('rejeita 1 dígito (1) com slug bank-agency-invalid', () => {
    const r = PaymentTarget.createBankAccount({ ...base, agency: '1' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'bank-agency-invalid');
  });

  it('rejeita não-numérico (abcd) com slug bank-agency-invalid', () => {
    const r = PaymentTarget.createBankAccount({ ...base, agency: 'abcd' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'bank-agency-invalid');
  });
});
