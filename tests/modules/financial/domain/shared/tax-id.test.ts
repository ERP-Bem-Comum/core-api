/**
 * Testes para `src/modules/financial/domain/shared/tax-id.ts`.
 *
 * Ticket FIN-VO-TAX-ID (W0 — RED).
 *
 * Golden fixtures dos exemplos literais do 000-request §3:
 *  §3.1 — CPF `111.444.777-35` (DVs 3 e 5 calculados manualmente)
 *  §3.2 — CNPJ `12.ABC.345/01DE-35` (DVs 3 e 5 calculados pela Serpro)
 *
 * Se o algoritmo módulo 11 estiver errado (peso, off-by-one, tabela ASCII),
 * esses 2 inputs serão rejeitados — o teste pega imediatamente.
 *
 * Padrão consistente com `tests/modules/financial/domain/shared/fitid.test.ts`:
 *  - module-as-namespace `import * as TaxId`
 *  - isOk/isErr para narrow do Result
 *  - AAA explícito em comentário
 *  - Sem shadowing de built-ins (lição FIN-VO-FITID W3)
 *
 * Estado esperado em W0: RED por ERR_MODULE_NOT_FOUND.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as TaxId from '#src/modules/financial/domain/shared/tax-id.ts';

// ─── Fixtures (golden) ──────────────────────────────────────────────────
// Forma com máscara canônica.
const VALID_CPF = '111.444.777-35';
// Forma sem máscara (após normalização).
const VALID_CPF_DIGITS = '11144477735';
// CPF do exemplo §3.1 — DVs calculados são 3 e 5.

// Forma com máscara canônica do exemplo §3.2 da Serpro.
const VALID_CNPJ = '12.ABC.345/01DE-35';
// Forma sem máscara (após normalização — sempre UPPERCASE).
const VALID_CNPJ_CHARS = '12ABC34501DE35';
// CNPJ alfanumérico do exemplo §3.2 — DVs calculados são 3 e 5.

// Inválidos.
const INVALID_CPF_DV = '11144477700'; // mesmos 9 primeiros, DVs errados
const INVALID_CNPJ_DV = '12ABC34501DE99'; // mesmos 12 primeiros, DVs errados
const ALL_ZEROS_CPF = '00000000000'; // D9 — todos iguais rejeitado mesmo passando módulo 11
const CPF_WITH_LETTER = '11A44477735'; // CPF com letra no corpo

describe('TaxId — module-as-namespace (Padrão D)', () => {
  it('module exposes fromString/fromCpf/fromCnpj/format/equals at top-level', () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = TaxId;
    // Assert
    assert.equal(typeof ns.fromString, 'function');
    assert.equal(typeof ns.fromCpf, 'function');
    assert.equal(typeof ns.fromCnpj, 'function');
    assert.equal(typeof ns.format, 'function');
    assert.equal(typeof ns.equals, 'function');
  });

  it('does NOT expose internal modulus-11 helpers (encapsulation)', () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = TaxId;
    // Assert — helpers internos não vazam (D6)
    assert.equal(ns.calculateCpfDV1, undefined);
    assert.equal(ns.calculateCpfDV2, undefined);
    assert.equal(ns.calculateCnpjDV1, undefined);
    assert.equal(ns.calculateCnpjDV2, undefined);
  });
});

describe('TaxId — fromString CPF happy path', () => {
  it('CA-6: accepts CPF with canonical mask "111.444.777-35"', () => {
    // Arrange / Act
    const r = TaxId.fromString(VALID_CPF);
    // Assert — golden test do §3.1
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.kind, 'CPF');
      if (r.value.kind === 'CPF') {
        assert.equal(r.value.digits, VALID_CPF_DIGITS);
      }
    }
  });

  it('CA-7: accepts CPF without mask "11144477735"', () => {
    // Arrange / Act
    const r = TaxId.fromString(VALID_CPF_DIGITS);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok && r.value.kind === 'CPF') {
      assert.equal(r.value.digits, VALID_CPF_DIGITS);
    }
  });

  it('CA-24: golden — DVs 3 and 5 (§3.1 example) computed correctly', () => {
    // Arrange — `111.444.777` base; algoritmo deve calcular DV1=3, DV2=5
    const r = TaxId.fromString('11144477735');
    // Assert — se algoritmo errar, qualquer outro DV no input rejeita
    assert.equal(isOk(r), true, 'CPF 111.444.777-35 deve passar pelo módulo 11');
  });
});

describe('TaxId — fromString CNPJ alfanumérico happy path', () => {
  it('CA-8: accepts CNPJ alfanumérico with canonical mask', () => {
    // Arrange / Act
    const r = TaxId.fromString(VALID_CNPJ);
    // Assert — golden test do §3.2 (Serpro)
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.kind, 'CNPJ');
      if (r.value.kind === 'CNPJ') {
        assert.equal(r.value.chars, VALID_CNPJ_CHARS);
      }
    }
  });

  it('CA-8: accepts CNPJ alfanumérico without mask', () => {
    // Arrange / Act
    const r = TaxId.fromString(VALID_CNPJ_CHARS);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok && r.value.kind === 'CNPJ') {
      assert.equal(r.value.chars, VALID_CNPJ_CHARS);
    }
  });

  it('CA-9: normalizes lowercase letters to UPPERCASE', () => {
    // Arrange / Act
    const r = TaxId.fromString('12.abc.345/01de-35');
    // Assert — D5: lowercase aceito, normalizado UPPERCASE
    assert.equal(isOk(r), true);
    if (r.ok && r.value.kind === 'CNPJ') {
      assert.equal(r.value.chars, '12ABC34501DE35');
    }
  });

  it('CA-25: golden — DVs 3 and 5 (§3.2 Serpro example) computed correctly', () => {
    // Arrange — tabela ASCII (A=17, B=18, C=19, D=20, E=21) + pesos
    //   1ª etapa: 5,4,3,2,9,8,7,6,5,4,3,2 → soma 459 → resto 8 → DV1=3
    //   2ª etapa: 6,5,4,3,2,9,8,7,6,5,4,3,2 → soma 424 → resto 6 → DV2=5
    const r = TaxId.fromString(VALID_CNPJ_CHARS);
    // Assert — se tabela ASCII ou pesos divergirem, esse input rejeita
    assert.equal(
      isOk(r),
      true,
      'CNPJ alfanumérico 12ABC34501DE35 (Serpro §3.2) deve passar módulo 11',
    );
  });
});

describe('TaxId — fromString length errors', () => {
  it('CA-10: rejects empty string with tax-id-empty', () => {
    // Arrange / Act
    const r = TaxId.fromString('');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'tax-id-empty');
  });

  it('CA-11: rejects whitespace-only with tax-id-empty (post-normalize)', () => {
    // Arrange / Act
    const r = TaxId.fromString('   ');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'tax-id-empty');
  });

  it('CA-12: rejects too short (3 chars) with tax-id-invalid-length', () => {
    // Arrange / Act
    const r = TaxId.fromString('123');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'tax-id-invalid-length');
  });

  it('CA-13: rejects too long (15 chars) with tax-id-invalid-length', () => {
    // Arrange
    const raw = '1'.repeat(15);
    // Act
    const r = TaxId.fromString(raw);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'tax-id-invalid-length');
  });

  it('rejects 12 chars (between CPF=11 and CNPJ=14)', () => {
    // Arrange
    const raw = '1'.repeat(12);
    // Act
    const r = TaxId.fromString(raw);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'tax-id-invalid-length');
  });
});

describe('TaxId — fromString check-digit mismatch', () => {
  it('CA-14: rejects CPF with wrong DVs', () => {
    // Arrange / Act
    const r = TaxId.fromString(INVALID_CPF_DV);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'cpf-check-digit-mismatch');
  });

  it('CA-15: rejects CPF with all-zeros (D9 — todos iguais reservado)', () => {
    // Arrange / Act
    const r = TaxId.fromString(ALL_ZEROS_CPF);
    // Assert — passa módulo 11 mas é reservado pela RFB
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'cpf-check-digit-mismatch');
  });

  it('CA-15: rejects CPF with all-ones (D9)', () => {
    // Arrange / Act
    const r = TaxId.fromString('11111111111');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'cpf-check-digit-mismatch');
  });

  it('CA-16: rejects CNPJ alfanumérico with wrong DVs', () => {
    // Arrange / Act
    const r = TaxId.fromString(INVALID_CNPJ_DV);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'cnpj-check-digit-mismatch');
  });
});

describe('TaxId — fromString charset errors', () => {
  it('CA-17: rejects CPF-length input with letter in body', () => {
    // Arrange — 11 chars sendo um deles letra. CPF não aceita letra.
    // Act
    const r = TaxId.fromString(CPF_WITH_LETTER);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'tax-id-invalid-charset');
  });

  it('CA-18: rejects CNPJ-length input with letter in DV position', () => {
    // Arrange — 14 chars todos alfanuméricos, mas DVs (posições 12-13) são
    // letras. Regra: DVs SEMPRE numéricos (CNPJ_BODY_REGEX = /^[0-9A-Z]{12}\d{2}$/).
    // Nota: `@` no body seria removido pelo `normalize()` (tratado como noise
    // tipo `.` ou `-`), resultando em invalid-length, não charset. Para forçar
    // charset error é preciso input que passe pelo normalize com 14 chars.
    // Act
    const r = TaxId.fromString('12ABC34501DEAB');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'tax-id-invalid-charset');
  });
});

describe('TaxId — fromCpf / fromCnpj specific constructors', () => {
  it('CA-19: fromCpf returns CPF type (narrowed)', () => {
    // Arrange / Act
    const r = TaxId.fromCpf(VALID_CPF_DIGITS);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) {
      // Type-level: r.value é CPF (não CPF | CNPJ)
      assert.equal(r.value.kind, 'CPF');
      assert.equal(r.value.digits, VALID_CPF_DIGITS);
    }
  });

  it('CA-19: fromCnpj returns CNPJ type (narrowed)', () => {
    // Arrange / Act
    const r = TaxId.fromCnpj(VALID_CNPJ_CHARS);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) {
      assert.equal(r.value.kind, 'CNPJ');
      assert.equal(r.value.chars, VALID_CNPJ_CHARS);
    }
  });

  it('fromCpf rejects CNPJ-length input', () => {
    // Arrange — passar CNPJ válido para fromCpf deve falhar (comprimento errado)
    // Act
    const r = TaxId.fromCpf(VALID_CNPJ_CHARS);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'tax-id-invalid-length');
  });
});

describe('TaxId — format', () => {
  it('CA-20: format CPF returns "XXX.XXX.XXX-XX"', () => {
    // Arrange
    const r = TaxId.fromString(VALID_CPF_DIGITS);
    // Act / Assert
    if (r.ok) {
      assert.equal(TaxId.format(r.value), VALID_CPF);
    }
  });

  it('CA-21: format CNPJ returns "XX.XXX.XXX/XXXX-XX" with UPPERCASE letters', () => {
    // Arrange
    const r = TaxId.fromString(VALID_CNPJ_CHARS);
    // Act / Assert
    if (r.ok) {
      assert.equal(TaxId.format(r.value), VALID_CNPJ);
    }
  });

  it('format roundtrip: fromString(format(x)) → equals(x)', () => {
    // Arrange
    const r1 = TaxId.fromString(VALID_CPF_DIGITS);
    if (r1.ok) {
      const formatted = TaxId.format(r1.value);
      // Act
      const r2 = TaxId.fromString(formatted);
      // Assert — roundtrip preserva valor
      if (r2.ok) assert.equal(TaxId.equals(r1.value, r2.value), true);
    }
  });
});

describe('TaxId — equals', () => {
  it('CA-22: returns false when kind differs (CPF vs CNPJ)', () => {
    // Arrange
    const cpf = TaxId.fromString(VALID_CPF_DIGITS);
    const cnpj = TaxId.fromString(VALID_CNPJ_CHARS);
    // Act / Assert
    if (cpf.ok && cnpj.ok) {
      assert.equal(TaxId.equals(cpf.value, cnpj.value), false);
    }
  });

  it('CA-23: returns true for two CPFs from same digits', () => {
    // Arrange
    const a = TaxId.fromString(VALID_CPF_DIGITS);
    const b = TaxId.fromString(VALID_CPF);
    // Act / Assert — máscara não importa, valor canônico igual
    if (a.ok && b.ok) {
      assert.equal(TaxId.equals(a.value, b.value), true);
    }
  });

  it('returns true for two CNPJs from same chars', () => {
    // Arrange
    const a = TaxId.fromString(VALID_CNPJ);
    const b = TaxId.fromString(VALID_CNPJ_CHARS);
    // Act / Assert
    if (a.ok && b.ok) {
      assert.equal(TaxId.equals(a.value, b.value), true);
    }
  });

  it('returns true for case-insensitive CNPJ inputs', () => {
    // Arrange — D5: lowercase normaliza para UPPERCASE
    const a = TaxId.fromString('12abc34501de35');
    const b = TaxId.fromString('12ABC34501DE35');
    // Act / Assert
    if (a.ok && b.ok) {
      assert.equal(TaxId.equals(a.value, b.value), true);
    }
  });
});

describe('TaxId — type-level smoke (CA-2..CA-5)', () => {
  it('discriminated union narrows via kind discriminator', () => {
    // Arrange
    const r = TaxId.fromString(VALID_CPF_DIGITS);
    // Act / Assert — narrowing por discriminator
    if (r.ok) {
      switch (r.value.kind) {
        case 'CPF': {
          // type-level: r.value.digits está disponível, r.value.chars não
          assert.equal(typeof r.value.digits, 'string');
          break;
        }
        case 'CNPJ': {
          assert.equal(typeof r.value.chars, 'string');
          break;
        }
        default: {
          const _exhaustive: never = r.value;
          return _exhaustive;
        }
      }
    }
  });

  it('TaxIdError union has 5 variants — exhaustive switch', () => {
    // Arrange
    const cases: readonly TaxId.TaxIdError[] = [
      'tax-id-empty',
      'tax-id-invalid-length',
      'tax-id-invalid-charset',
      'cpf-check-digit-mismatch',
      'cnpj-check-digit-mismatch',
    ];
    const classify = (e: TaxId.TaxIdError): string => {
      switch (e) {
        case 'tax-id-empty':
          return 'empty';
        case 'tax-id-invalid-length':
          return 'length';
        case 'tax-id-invalid-charset':
          return 'charset';
        case 'cpf-check-digit-mismatch':
          return 'cpf-dv';
        case 'cnpj-check-digit-mismatch':
          return 'cnpj-dv';
        default: {
          const _exhaustive: never = e;
          return _exhaustive;
        }
      }
    };
    // Act / Assert
    assert.deepEqual(cases.map(classify), ['empty', 'length', 'charset', 'cpf-dv', 'cnpj-dv']);
  });
});
