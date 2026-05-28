/**
 * W0 (RED) - Tests para PasswordHash (tipo opaco) do modulo auth.
 *
 * Ticket: AUTH-VO-PASSWORD.
 *
 * PasswordHash representa um hash JA computado (pelo port PasswordHasher, X1).
 * O dominio NAO computa nem valida o formato interno (acoplaria ao algoritmo do adapter).
 * fromString reidrata de string (ex.: row do banco). NAO normaliza.
 *
 * Cobre CA4..CA6:
 *   - CA4: hash nao-vazio retorna ok, valor preservado
 *   - CA5: vazio / so espacos retorna err('password-hash-empty')
 *   - CA6: fromString nunca lanca
 *
 * DEVEM FALHAR em W0 - password-hash.ts ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';

describe('PasswordHash.fromString', () => {
  it('CA4: hash nao-vazio retorna ok com valor preservado', () => {
    // Arrange - formato argon2id ilustrativo; dominio trata como opaco
    const raw = '$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$aGFzaHZhbHVl';

    // Act
    const r = PasswordHash.fromString(raw);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, raw);
    }
  });

  it('CA5: string vazia retorna err password-hash-empty', () => {
    // Act
    const r = PasswordHash.fromString('');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'password-hash-empty');
    }
  });

  it('CA5: so espacos retorna err password-hash-empty', () => {
    // Act
    const r = PasswordHash.fromString('   ');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'password-hash-empty');
    }
  });
});
