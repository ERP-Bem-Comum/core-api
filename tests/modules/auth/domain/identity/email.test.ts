/**
 * W0 (RED) - Tests para Email (branded type + smart constructor) do modulo auth.
 *
 * Ticket: AUTH-VO-EMAIL.
 *
 * Cobre CA1..CA5 do 000-request:
 *   - CA1: email valido retorna ok, normalizado (trim + lowercase)
 *   - CA2: vazio / so espacos retorna err('email-empty')
 *   - CA3: formato invalido retorna err('email-invalid-format')
 *   - CA4: acima de 254 chars (RFC 5321) retorna err('email-too-long')
 *   - CA5: branded - parse nunca lanca, sempre retorna Result (sem throw/class)
 *
 * Estes tests DEVEM FALHAR em W0 - src/modules/auth/ ainda nao existe.
 *
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Email from '#src/modules/auth/domain/identity/email.ts';

describe('Email.parse', () => {
  it('CA1: email valido retorna ok', () => {
    // Act
    const r = Email.parse('user@example.com');

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'user@example.com');
    }
  });

  it('CA1: normaliza trim + lowercase', () => {
    // Act
    const r = Email.parse('  USER@Example.COM  ');

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'user@example.com');
    }
  });

  it('CA2: string vazia retorna err email-empty', () => {
    // Act
    const r = Email.parse('');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'email-empty');
    }
  });

  it('CA2: so espacos retorna err email-empty', () => {
    // Act
    const r = Email.parse('   ');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'email-empty');
    }
  });

  it('CA3: string sem @ retorna err email-invalid-format', () => {
    // Act
    const r = Email.parse('invalid');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'email-invalid-format');
    }
  });

  it('CA3: dominio sem ponto retorna err email-invalid-format', () => {
    // Act
    const r = Email.parse('user@localhost');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'email-invalid-format');
    }
  });

  it('CA4: acima de 254 chars retorna err email-too-long', () => {
    // Arrange - formato valido mas comprimento > 254
    const local = 'a'.repeat(64);
    const domain = 'b'.repeat(200);
    const tooLong = `${local}@${domain}.com`; // 64 + 1 + 200 + 4 = 269 chars

    // Act
    const r = Email.parse(tooLong);

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'email-too-long');
    }
  });

  it('CA5: parse nunca lanca - entrada estranha retorna Result', () => {
    // Act / Assert - sem try/catch: parse e total, devolve err em vez de throw
    const r = Email.parse('@@@');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'email-invalid-format');
    }
  });
});
