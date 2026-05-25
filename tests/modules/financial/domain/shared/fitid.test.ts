/**
 * Testes para `src/modules/financial/domain/shared/fitid.ts`.
 *
 * Ticket FIN-VO-FITID (W0 — RED).
 *
 * Cobre CA-2..CA-12 do `.claude/.pipeline/FIN-VO-FITID/000-request.md`:
 *  CA-2   Type FITID é `Brand<string, 'FITID'>` — verificado via BrandOf
 *  CA-3   Type FITIDError === `'fitid-empty' | 'fitid-too-long'` — exhaustive switch
 *  CA-4   `fromString('abc123')` → ok
 *  CA-5   `fromString('')` → err 'fitid-empty'
 *  CA-6   `fromString('   ')` → err 'fitid-empty' (trim aplicado antes)
 *  CA-7   `fromString('  abc  ')` → ok com valor 'abc'
 *  CA-8   `fromString('x'.repeat(256))` → err 'fitid-too-long'
 *  CA-9   `fromString('x'.repeat(255))` → ok (boundary inclusivo)
 *  CA-10  `equals(a, b)` true quando inputs iguais pós-trim
 *  CA-11  `equals(a, b)` false quando inputs diferem
 *  CA-12  `equals(a, b)` false quando case difere (case-sensitive — D6)
 *
 * Padrão consistente com `tests/modules/contracts/domain/shared/money.test.ts`:
 *  - module-as-namespace via `import * as FITID`
 *  - isOk/isErr para narrow do Result
 *  - AAA explícito em comentário
 *
 * Estado esperado em W0: RED por ERR_MODULE_NOT_FOUND — arquivo
 * `src/modules/financial/domain/shared/fitid.ts` não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import type { BrandOf } from '#src/shared/index.ts';
import * as FITID from '#src/modules/financial/domain/shared/fitid.ts';

describe('FITID — module-as-namespace (Padrão D)', () => {
  it('module exposes fromString and equals at top-level (not nested)', () => {
    // Arrange — import já no topo
    // Act
    const ns: Readonly<Record<string, unknown>> = FITID;
    // Assert
    assert.equal(typeof ns.fromString, 'function');
    assert.equal(typeof ns.equals, 'function');
  });

  it("does NOT expose a nested `FITID` namespace-object (DON'T B§7)", () => {
    // Arrange / Act
    const ns: Readonly<Record<string, unknown>> = FITID;
    // Assert
    assert.equal(ns.FITID, undefined);
  });
});

describe('FITID — fromString construction', () => {
  it('CA-4: accepts valid alphanumeric string', () => {
    // Arrange / Act
    const r = FITID.fromString('abc123');
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, 'abc123');
  });

  it('CA-7: trims surrounding whitespace and keeps inner content', () => {
    // Arrange / Act
    const r = FITID.fromString('  abc  ');
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value, 'abc');
  });

  it('CA-5: rejects empty string with `fitid-empty`', () => {
    // Arrange / Act
    const r = FITID.fromString('');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'fitid-empty');
  });

  it('CA-6: rejects whitespace-only string with `fitid-empty` (post-trim)', () => {
    // Arrange / Act
    const r = FITID.fromString('   ');
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'fitid-empty');
  });

  it('CA-9: accepts exactly 255 chars (boundary inclusive — OFX 2.x §11.4.2)', () => {
    // Arrange
    const raw = 'x'.repeat(255);
    // Act
    const r = FITID.fromString(raw);
    // Assert
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.length, 255);
  });

  it('CA-8: rejects 256 chars with `fitid-too-long`', () => {
    // Arrange
    const raw = 'x'.repeat(256);
    // Act
    const r = FITID.fromString(raw);
    // Assert
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error, 'fitid-too-long');
  });

  it('D5: accepts hex-like (Itaú style) string', () => {
    // Arrange
    const raw = 'a3f9c0e8b4d7e2f1';
    // Act
    const r = FITID.fromString(raw);
    // Assert — charset permissivo (D5 do 000-request)
    assert.equal(isOk(r), true);
  });

  it('D5: accepts base64-like string with + and /', () => {
    // Arrange
    const raw = 'AB+/cd==';
    // Act
    const r = FITID.fromString(raw);
    // Assert — D5 permite caracteres especiais
    assert.equal(isOk(r), true);
  });
});

describe('FITID — equals', () => {
  it('CA-10: returns true for two values built from the same input', () => {
    // Arrange
    const a = FITID.fromString('abc');
    const b = FITID.fromString('abc');
    // Act / Assert
    assert.equal(a.ok && b.ok, true);
    if (a.ok && b.ok) assert.equal(FITID.equals(a.value, b.value), true);
  });

  it('CA-10: equals collapses whitespace differences via trim', () => {
    // Arrange — D2: trim normaliza pontas; valores resultantes idênticos
    const a = FITID.fromString('abc');
    const b = FITID.fromString('  abc  ');
    // Act / Assert
    if (a.ok && b.ok) assert.equal(FITID.equals(a.value, b.value), true);
  });

  it('CA-11: returns false for distinct values', () => {
    // Arrange
    const a = FITID.fromString('abc');
    const b = FITID.fromString('xyz');
    // Act / Assert
    if (a.ok && b.ok) assert.equal(FITID.equals(a.value, b.value), false);
  });

  it('CA-12: equals is case-sensitive (D6)', () => {
    // Arrange
    const a = FITID.fromString('AB');
    const b = FITID.fromString('ab');
    // Act / Assert
    if (a.ok && b.ok) assert.equal(FITID.equals(a.value, b.value), false);
  });
});

describe('FITID — type-level smoke (CA-2, CA-3)', () => {
  it('CA-2: BrandOf<FITID> resolves to literal "FITID"', () => {
    // Arrange / Act — pure compile-time check materializado em runtime
    type Tag = BrandOf<FITID.FITID>;
    const tag: Tag = 'FITID';
    // Assert
    assert.equal(tag, 'FITID');
  });

  it('CA-3: FITIDError union has exactly 2 variants — exhaustive switch', () => {
    // Arrange — todas as variantes precisam ser cobertas pelo switch.
    // Se uma nova variante for adicionada, o `never` no default quebra
    // compilação aqui — proteção contra esquecimento.
    const cases: readonly FITID.FITIDError[] = ['fitid-empty', 'fitid-too-long'];
    const classify = (e: FITID.FITIDError): string => {
      switch (e) {
        case 'fitid-empty':
          return 'empty';
        case 'fitid-too-long':
          return 'too-long';
        default: {
          const _exhaustive: never = e;
          return _exhaustive;
        }
      }
    };
    // Act / Assert
    assert.deepEqual(cases.map(classify), ['empty', 'too-long']);
  });
});
