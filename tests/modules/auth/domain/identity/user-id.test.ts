/**
 * W0 (RED) - Tests para UserId (branded id) do modulo auth.
 *
 * Ticket: AUTH-AGG-USER. Espelha role-id.ts (UUID v4).
 *
 * Cobre CA1..CA3: generate aceito por rehydrate; rehydrate uuid ok; invalido -> err.
 * DEVEM FALHAR em W0 - user-id.ts nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

describe('UserId', () => {
  it('CA1: generate produz id aceito por rehydrate', () => {
    const r = UserId.rehydrate(UserId.generate());
    assert.equal(r.ok, true);
  });

  it('CA2: rehydrate de uuid v4 valido retorna ok', () => {
    const raw = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
    const r = UserId.rehydrate(raw);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, raw);
    }
  });

  it('CA3: rehydrate de string invalida retorna err user-id-invalid', () => {
    const r = UserId.rehydrate('not-a-uuid');
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'user-id-invalid');
    }
  });
});
