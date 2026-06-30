/**
 * CTR-AUTH-RESET-TOKEN — W0 (RED) — BE-REC-003 (token de reset, dominio puro).
 *
 * Token opaco one-time + TTL: `tokenHash` persiste (claro vai ao email), `usedAt` marca consumo.
 * Estados: pending > expired > used (precedencia). `consume` e one-time (segundo uso falha).
 * DEVE FALHAR ate o W1: `password-reset-token.ts` ainda nao existe. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as ResetToken from '#src/modules/auth/domain/session/password-reset-token.ts';
import * as ResetTokenId from '#src/modules/auth/domain/session/password-reset-token-id.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

const REQUESTED = new Date('2026-05-30T12:00:00.000Z');
const EXPIRES = new Date('2026-05-30T12:15:00.000Z'); // TTL 15min

const makeInput = () => ({
  id: ResetTokenId.generate(),
  userId: UserId.generate(),
  tokenHash: 'sha256:abc123',
  requestedAt: REQUESTED,
  expiresAt: EXPIRES,
});

describe('PasswordResetToken', () => {
  it('issue valido -> pending; rejeita hash vazio e expiry <= request', () => {
    const okR = ResetToken.issue(makeInput());
    assert.equal(okR.ok, true);
    if (okR.ok) assert.equal(ResetToken.state(okR.value, REQUESTED), 'pending');

    const emptyHash = ResetToken.issue({ ...makeInput(), tokenHash: '   ' });
    assert.equal(emptyHash.ok, false);
    if (!emptyHash.ok) assert.equal(emptyHash.error, 'reset-token-hash-empty');

    const badExpiry = ResetToken.issue({ ...makeInput(), expiresAt: REQUESTED });
    assert.equal(badExpiry.ok, false);
    if (!badExpiry.ok) assert.equal(badExpiry.error, 'reset-token-expiry-before-request');
  });

  it('state: pending antes de expirar, expired apos o TTL', () => {
    const t = ResetToken.issue(makeInput());
    assert.equal(t.ok, true);
    if (!t.ok) return;
    assert.equal(ResetToken.state(t.value, new Date(EXPIRES.getTime() - 1000)), 'pending');
    assert.equal(ResetToken.state(t.value, EXPIRES), 'expired');
  });

  it('consume e one-time: 1o uso ok (marca usedAt), 2o uso -> reset-token-used', () => {
    const t = ResetToken.issue(makeInput());
    assert.equal(t.ok, true);
    if (!t.ok) return;

    const at = new Date('2026-05-30T12:05:00.000Z');
    const used = ResetToken.consume(t.value, at);
    assert.equal(used.ok, true);
    if (!used.ok) return;
    assert.equal(ResetToken.state(used.value, at), 'used');

    const again = ResetToken.consume(used.value, at);
    assert.equal(again.ok, false);
    if (!again.ok) assert.equal(again.error, 'reset-token-used');
  });

  it('consume apos o TTL -> reset-token-expired', () => {
    const t = ResetToken.issue(makeInput());
    assert.equal(t.ok, true);
    if (!t.ok) return;
    const r = ResetToken.consume(t.value, new Date(EXPIRES.getTime() + 1000));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'reset-token-expired');
  });
});
