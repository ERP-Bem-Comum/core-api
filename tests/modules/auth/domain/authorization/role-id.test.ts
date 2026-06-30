/**
 * W0 (RED) - Tests para RoleId (branded id + generate/rehydrate) do modulo auth.
 *
 * Ticket: AUTH-AGG-ROLE.
 *
 * Espelha o padrao de src/modules/contracts/domain/shared/contract-id.ts (UUID v4).
 *
 * Cobre CA1..CA3:
 *   - CA1: generate() produz id aceito por rehydrate
 *   - CA2: rehydrate de uuid v4 valido retorna ok
 *   - CA3: rehydrate de string invalida retorna err('role-id-invalid')
 *
 * DEVEM FALHAR em W0 - role-id.ts ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as RoleId from '#src/modules/auth/domain/authorization/role-id.ts';

describe('RoleId', () => {
  it('CA1: generate produz id aceito por rehydrate', () => {
    // Act
    const id = RoleId.generate();
    const r = RoleId.rehydrate(id);

    // Assert
    assert.equal(r.ok, true);
  });

  it('CA2: rehydrate de uuid v4 valido retorna ok', () => {
    // Arrange
    const raw = '3f2504e0-4f89-41d3-9a0c-0305e82c3301';

    // Act
    const r = RoleId.rehydrate(raw);

    // Assert
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, raw);
    }
  });

  it('CA3: rehydrate de string invalida retorna err role-id-invalid', () => {
    // Act
    const r = RoleId.rehydrate('not-a-uuid');

    // Assert
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'role-id-invalid');
    }
  });
});
