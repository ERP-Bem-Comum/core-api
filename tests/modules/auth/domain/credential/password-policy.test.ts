/**
 * W0 (RED) - Tests para Password (politica de forca) do modulo auth.
 *
 * Ticket: AUTH-VO-PASSWORD.
 *
 * Politica: comprimento em [8, 128]. NAO normaliza (senha preserva caixa + espacos).
 * Regras de composicao NAO sao impostas (NIST 800-63B: comprimento > complexidade).
 *
 * Cobre CA1..CA3 + CA6:
 *   - CA1: senha valida [8,128] retorna ok, valor preservado (sem normalizacao)
 *   - CA2: < 8 chars retorna err('password-too-short')
 *   - CA3: > 128 chars retorna err('password-too-long')
 *   - CA6: parse nunca lanca
 *
 * DEVEM FALHAR em W0 - password-policy.ts ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Password from '#src/modules/auth/domain/credential/password-policy.ts';

describe('Password.parse', () => {
  it('CA1: senha valida retorna ok com valor preservado', () => {
    // Act
    const r = Password.parse('super-secret-123');

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'super-secret-123');
    }
  });

  it('CA1: NAO normaliza - preserva caixa e espacos', () => {
    // Arrange - espacos nas bordas + maiusculas devem permanecer
    const raw = '  AbCdEfg  ';

    // Act
    const r = Password.parse(raw);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, raw);
    }
  });

  it('CA1: boundary - exatamente 8 chars retorna ok', () => {
    // Act
    const r = Password.parse('a'.repeat(8));

    // Assert
    assert.equal(r.ok, true);
  });

  it('CA1: boundary - exatamente 128 chars retorna ok', () => {
    // Act
    const r = Password.parse('a'.repeat(128));

    // Assert
    assert.equal(r.ok, true);
  });

  it('CA2: string vazia retorna err password-too-short', () => {
    // Act
    const r = Password.parse('');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'password-too-short');
    }
  });

  it('CA2: 7 chars retorna err password-too-short', () => {
    // Act
    const r = Password.parse('short12');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'password-too-short');
    }
  });

  it('CA3: 129 chars retorna err password-too-long', () => {
    // Act
    const r = Password.parse('a'.repeat(129));

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'password-too-long');
    }
  });

  // BE-REC-005: blocklist de senhas vazadas/comuns (OWASP WSTG-ATHN-07, NIST 800-63B).
  it('BE-REC-005: senha comum no comprimento valido retorna err password-too-common', () => {
    for (const common of ['password123', 'senha123', '12345678', 'qwerty123']) {
      const r = Password.parse(common);
      assert.equal(r.ok, false, `esperava bloquear "${common}"`);
      if (!r.ok) assert.equal(r.error, 'password-too-common');
    }
  });

  it('BE-REC-005: blocklist e case-insensitive', () => {
    const r = Password.parse('PASSWORD123');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'password-too-common');
  });

  it('BE-REC-005: senha forte fora da blocklist passa', () => {
    const r = Password.parse('correct-horse-battery-staple-42');
    assert.equal(r.ok, true);
  });
});
