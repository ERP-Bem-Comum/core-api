/**
 * CTR-AUTH-RESET-TOKEN — W0 (RED) — id do token de reset (espelha refresh-token-id). ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as ResetTokenId from '#src/modules/auth/domain/session/password-reset-token-id.ts';

describe('PasswordResetTokenId', () => {
  it('generate produz UUID v4 reidratavel', () => {
    const id = ResetTokenId.generate();
    const r = ResetTokenId.rehydrate(id);
    assert.equal(r.ok, true);
  });

  it('rehydrate rejeita string invalida', () => {
    const r = ResetTokenId.rehydrate('nao-e-uuid');
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'password-reset-token-id-invalid');
  });
});
