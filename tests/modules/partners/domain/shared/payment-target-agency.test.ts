/**
 * PAR-PARTNER-BANK-PIX (US1). Validação de `agency` no VO compartilhado `domain/shared/payment-target.ts`.
 *
 * `createBankAccount` valida o formato de agência (4 dígitos + DV opcional) → `invalid-bank-agency`.
 * A regra é compartilhada pelos 4 tipos de parceiro (Supplier, Act, Financier, Collaborator).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { createBankAccount } from '#src/modules/partners/domain/shared/payment-target.ts';

const base = { bank: 'Banco X', accountNumber: '12345', checkDigit: '6' };

describe('payment-target — validação de agency (US1)', () => {
  it('aceita agência de 4 dígitos sem DV', () => {
    const r = createBankAccount({ ...base, agency: '0001' });
    assert.ok(r.ok, `esperado ok, veio ${r.ok ? '' : r.error}`);
  });

  it('aceita agência de 4 dígitos com DV (formato 0000-0)', () => {
    const r = createBankAccount({ ...base, agency: '0001-2' });
    assert.ok(r.ok, `esperado ok, veio ${r.ok ? '' : r.error}`);
  });

  it('rejeita agência com menos de 4 dígitos → invalid-bank-agency', () => {
    const r = createBankAccount({ ...base, agency: '12' });
    assert.ok(!r.ok);
    assert.equal(r.error, 'invalid-bank-agency');
  });

  it('rejeita agência não-numérica → invalid-bank-agency', () => {
    const r = createBankAccount({ ...base, agency: 'abcd' });
    assert.ok(!r.ok);
    assert.equal(r.error, 'invalid-bank-agency');
  });

  it('mantém invalid-bank-account para banco vazio', () => {
    const r = createBankAccount({ ...base, bank: '   ', agency: '0001' });
    assert.ok(!r.ok);
    assert.equal(r.error, 'invalid-bank-account');
  });
});
