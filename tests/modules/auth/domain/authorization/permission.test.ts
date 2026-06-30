/**
 * W0 (RED) - Tests para Permission (branded type + smart constructor) do modulo auth.
 *
 * Ticket: AUTH-VO-PERMISSION.
 *
 * Formato canonico: resource:action (dois segmentos kebab alfanumericos separados por ':').
 *
 * Cobre CA1..CA4 do 000-request:
 *   - CA1: permission valida retorna ok, normalizada (trim + lowercase)
 *   - CA2: vazio / so espacos retorna err('permission-empty')
 *   - CA3: formato invalido retorna err('permission-invalid-format')
 *   - CA4: branded - parse nunca lanca, sempre retorna Result (sem throw/class)
 *
 * Estes tests DEVEM FALHAR em W0 - permission.ts ainda nao existe.
 *
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Permission from '#src/modules/auth/domain/authorization/permission.ts';

describe('Permission.parse', () => {
  it('CA1: resource:action valido retorna ok', () => {
    // Act
    const r = Permission.parse('contract:delete');

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'contract:delete');
    }
  });

  it('CA1: action com hifen (mass-approve) retorna ok', () => {
    // Act
    const r = Permission.parse('contract:mass-approve');

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'contract:mass-approve');
    }
  });

  it('CA1: normaliza trim + lowercase', () => {
    // Act
    const r = Permission.parse('  Contract:Mass-Approve  ');

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, 'contract:mass-approve');
    }
  });

  it('CA2: string vazia retorna err permission-empty', () => {
    // Act
    const r = Permission.parse('');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'permission-empty');
    }
  });

  it('CA2: so espacos retorna err permission-empty', () => {
    // Act
    const r = Permission.parse('   ');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'permission-empty');
    }
  });

  it('CA3: sem dois-pontos retorna err permission-invalid-format', () => {
    // Act
    const r = Permission.parse('contractdelete');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'permission-invalid-format');
    }
  });

  it('CA3: action vazio retorna err permission-invalid-format', () => {
    // Act
    const r = Permission.parse('contract:');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'permission-invalid-format');
    }
  });

  it('CA3: resource vazio retorna err permission-invalid-format', () => {
    // Act
    const r = Permission.parse(':delete');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'permission-invalid-format');
    }
  });

  it('CA3: mais de um dois-pontos retorna err permission-invalid-format', () => {
    // Act
    const r = Permission.parse('contract:delete:extra');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'permission-invalid-format');
    }
  });

  it('CA4: parse nunca lanca - entrada estranha retorna Result', () => {
    // Act / Assert - parse e total, devolve err em vez de throw
    const r = Permission.parse('@@@');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'permission-invalid-format');
    }
  });
});
