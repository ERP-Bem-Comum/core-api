/**
 * Testes para `src/modules/financial/domain/shared/beneficiary-bank-data.ts`.
 *
 * Ticket FIN-VO-BENEFICIARY-BANK-DATA (W0 — RED).
 *
 * Cobre CA-5..CA-11, CA-15..CA-20, CA-22 do
 * `.claude/.pipeline/FIN-VO-BENEFICIARY-BANK-DATA/000-request.md`:
 *
 *  CA-5  fromRaw aceita input válido
 *  CA-6  bankCode com 2 dígitos → bank-code-invalid
 *  CA-7  bankCode com letras → bank-code-invalid
 *  CA-8  agency com/sem DV
 *  CA-9  agency malformada → agency-invalid
 *  CA-10 account com DV
 *  CA-11 account sem DV → account-invalid
 *  CA-15 holderName trim aplicado
 *  CA-16 holderName empty/whitespace → holder-name-empty
 *  CA-17 holderName boundary 255 ok / 256 too-long
 *  CA-18 fail-fast: 1º erro retornado
 *  CA-19 equals true para inputs iguais
 *  CA-20 equals false quando qualquer campo difere
 *  CA-22 (do TaxId já validado — kind difere)
 *
 * Validação semântica de CPF/CNPJ ficou em FIN-VO-TAX-ID (closed-green).
 * Este VO consome `TaxId` JÁ validado — fixtures constroem TaxId via
 * `TaxId.fromString` e usam o valor brandado.
 *
 * Lições preventivas aplicadas:
 *  - Sem shadowing de built-ins (FIN-VO-FITID W3)
 *  - Sem indexed access em arrays (FIN-VO-TAX-ID W3)
 *  - Sem async sem await (FIN-CLI-WIRE W3)
 *
 * Estado esperado em W0: RED por ERR_MODULE_NOT_FOUND.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as TaxId from '#src/modules/financial/domain/shared/tax-id.ts';
import * as BeneficiaryBankData from '#src/modules/financial/domain/shared/beneficiary-bank-data.ts';

// ─── Fixtures ──────────────────────────────────────────────────────────

// Constrói TaxId válido para usar em fixtures. IIFE com throw é aceitável em
// código de teste (regra de domínio "zero throw" aplica-se a src/, não tests).
const VALID_TAX_ID_CPF = ((): TaxId.CPF => {
  const r = TaxId.fromCpf('11144477735');
  if (!r.ok) throw new Error(`fixture VALID_TAX_ID_CPF broken: ${r.error}`);
  return r.value;
})();

const VALID_TAX_ID_CNPJ = ((): TaxId.CNPJ => {
  const r = TaxId.fromCnpj('12ABC34501DE35');
  if (!r.ok) throw new Error(`fixture VALID_TAX_ID_CNPJ broken: ${r.error}`);
  return r.value;
})();

const VALID_INPUT: BeneficiaryBankData.BeneficiaryBankDataInput = {
  bankCode: '341',
  agency: '1234-5',
  account: '12345-6',
  holderTaxId: VALID_TAX_ID_CPF,
  holderName: 'Fornecedor X Ltda',
};

describe('BeneficiaryBankData — module-as-namespace (Padrão D)', () => {
  it('module exposes fromRaw and equals at top-level', () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = BeneficiaryBankData;
    // Assert
    assert.equal(typeof ns.fromRaw, 'function');
    assert.equal(typeof ns.equals, 'function');
  });

  it('does NOT expose nested `BeneficiaryBankData` namespace-object', () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = BeneficiaryBankData;
    // Assert
    assert.equal(ns.BeneficiaryBankData, undefined);
  });
});

describe('BeneficiaryBankData — fromRaw happy path', () => {
  it('CA-5: accepts complete valid input', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw(VALID_INPUT);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.bankCode, '341');
      assert.equal(r.value.agency, '1234-5');
      assert.equal(r.value.account, '12345-6');
      assert.equal(r.value.holderName, 'Fornecedor X Ltda');
    }
  });
});

describe('BeneficiaryBankData — bankCode validation', () => {
  it('accepts canonical 3-digit code (Bradesco "237", BB "001")', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, bankCode: '001' });
    // Assert
    assert.equal(isOk(r), true);
  });

  it('CA-6: rejects 2 digits with bank-code-invalid', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, bankCode: '34' });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bank-code-invalid');
  });

  it('CA-7: rejects 3 chars with letter with bank-code-invalid', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, bankCode: '34A' });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bank-code-invalid');
  });

  it('rejects 4 digits with bank-code-invalid', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, bankCode: '0341' });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bank-code-invalid');
  });
});

describe('BeneficiaryBankData — agency validation', () => {
  it('CA-8: accepts agency without DV (4 digits)', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, agency: '1234' });
    // Assert
    assert.equal(isOk(r), true);
  });

  it('CA-8: accepts agency with numeric DV', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, agency: '1234-5' });
    // Assert
    assert.equal(isOk(r), true);
  });

  it('CA-8: accepts agency with X DV (módulo 11)', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, agency: '1234-X' });
    // Assert — uppercase X aceita (módulo 11 do banco)
    assert.equal(isOk(r), true);
  });

  it('CA-9: rejects letters in body with agency-invalid', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, agency: 'abc' });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'agency-invalid');
  });

  it('CA-9: rejects empty agency with agency-invalid', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, agency: '' });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'agency-invalid');
  });
});

describe('BeneficiaryBankData — account validation', () => {
  it('CA-10: accepts account with numeric DV', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, account: '12345-6' });
    // Assert
    assert.equal(isOk(r), true);
  });

  it('CA-10: accepts long account with X DV', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, account: '1234567890-X' });
    // Assert
    assert.equal(isOk(r), true);
  });

  it('CA-11: rejects account without DV with account-invalid', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, account: '12345' });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'account-invalid');
  });

  it('CA-11: rejects account with letter in body', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, account: '12A45-6' });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'account-invalid');
  });
});

describe('BeneficiaryBankData — holderName validation', () => {
  it('CA-15: trim applied — "  Foo  " → "Foo"', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, holderName: '  Foo  ' });
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.holderName, 'Foo');
  });

  it('CA-16: rejects empty holderName with holder-name-empty', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, holderName: '' });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'holder-name-empty');
  });

  it('CA-16: rejects whitespace-only holderName with holder-name-empty', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, holderName: '   ' });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'holder-name-empty');
  });

  it('CA-17: accepts exactly 255 chars (boundary inclusive)', () => {
    // Arrange
    const name = 'A'.repeat(255);
    // Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, holderName: name });
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.holderName.length, 255);
  });

  it('CA-17: rejects 256 chars with holder-name-too-long', () => {
    // Arrange
    const name = 'A'.repeat(256);
    // Act
    const r = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, holderName: name });
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'holder-name-too-long');
  });
});

describe('BeneficiaryBankData — fail-fast order', () => {
  it('CA-18: returns bank-code-invalid first when bankCode AND agency both wrong', () => {
    // Arrange / Act
    const r = BeneficiaryBankData.fromRaw({
      ...VALID_INPUT,
      bankCode: '34', // inválido
      agency: 'xyz', // também inválido
    });
    // Assert — bankCode validado antes de agency
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'bank-code-invalid');
  });
});

describe('BeneficiaryBankData — equals', () => {
  it('CA-19: returns true for two values built from same input', () => {
    // Arrange
    const a = BeneficiaryBankData.fromRaw(VALID_INPUT);
    const b = BeneficiaryBankData.fromRaw(VALID_INPUT);
    // Act / Assert
    if (a.ok && b.ok) {
      assert.equal(BeneficiaryBankData.equals(a.value, b.value), true);
    }
  });

  it('CA-20: returns false when bankCode differs', () => {
    // Arrange
    const a = BeneficiaryBankData.fromRaw(VALID_INPUT);
    const b = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, bankCode: '001' });
    // Act / Assert
    if (a.ok && b.ok) {
      assert.equal(BeneficiaryBankData.equals(a.value, b.value), false);
    }
  });

  it('CA-20: returns false when agency differs', () => {
    // Arrange
    const a = BeneficiaryBankData.fromRaw(VALID_INPUT);
    const b = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, agency: '9999' });
    // Act / Assert
    if (a.ok && b.ok) {
      assert.equal(BeneficiaryBankData.equals(a.value, b.value), false);
    }
  });

  it('CA-20: returns false when account differs', () => {
    // Arrange
    const a = BeneficiaryBankData.fromRaw(VALID_INPUT);
    const b = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, account: '99999-9' });
    // Act / Assert
    if (a.ok && b.ok) {
      assert.equal(BeneficiaryBankData.equals(a.value, b.value), false);
    }
  });

  it('CA-20: returns false when holderTaxId differs (CPF vs CNPJ)', () => {
    // Arrange
    const a = BeneficiaryBankData.fromRaw(VALID_INPUT);
    const b = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, holderTaxId: VALID_TAX_ID_CNPJ });
    // Act / Assert
    if (a.ok && b.ok) {
      assert.equal(BeneficiaryBankData.equals(a.value, b.value), false);
    }
  });

  it('CA-20: returns false when holderName differs', () => {
    // Arrange
    const a = BeneficiaryBankData.fromRaw(VALID_INPUT);
    const b = BeneficiaryBankData.fromRaw({ ...VALID_INPUT, holderName: 'Outro Fornecedor' });
    // Act / Assert
    if (a.ok && b.ok) {
      assert.equal(BeneficiaryBankData.equals(a.value, b.value), false);
    }
  });
});

describe('BeneficiaryBankData — type-level smoke (CA-2..CA-4)', () => {
  it('BeneficiaryBankDataError union has 5 variants — exhaustive switch', () => {
    // Arrange
    const cases: readonly BeneficiaryBankData.BeneficiaryBankDataError[] = [
      'bank-code-invalid',
      'agency-invalid',
      'account-invalid',
      'holder-name-empty',
      'holder-name-too-long',
    ];
    const classify = (e: BeneficiaryBankData.BeneficiaryBankDataError): string => {
      switch (e) {
        case 'bank-code-invalid':
          return 'bank';
        case 'agency-invalid':
          return 'agency';
        case 'account-invalid':
          return 'account';
        case 'holder-name-empty':
          return 'name-empty';
        case 'holder-name-too-long':
          return 'name-long';
        default: {
          const _exhaustive: never = e;
          return _exhaustive;
        }
      }
    };
    // Act / Assert
    assert.deepEqual(cases.map(classify), ['bank', 'agency', 'account', 'name-empty', 'name-long']);
  });
});
