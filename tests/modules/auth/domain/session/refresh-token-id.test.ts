/**
 * W0 (RED) - Tests para RefreshTokenId do modulo auth. Ticket: AUTH-AGG-SESSION.
 * Espelha role-id.ts (UUID v4). DEVEM FALHAR em W0. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as RefreshTokenId from '#src/modules/auth/domain/session/refresh-token-id.ts';

describe('RefreshTokenId', () => {
  it('CA1: generate produz id aceito por rehydrate', () => {
    assert.equal(RefreshTokenId.rehydrate(RefreshTokenId.generate()).ok, true);
  });

  it('CA2: rehydrate de uuid v4 valido retorna ok', () => {
    const raw = '9b2e4c1a-3d5f-4a6b-8c7d-1e2f3a4b5c6d';
    const r = RefreshTokenId.rehydrate(raw);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value, raw);
  });

  it('CA3: rehydrate invalido retorna err refresh-token-id-invalid', () => {
    const r = RefreshTokenId.rehydrate('nope');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'refresh-token-id-invalid');
  });
});
