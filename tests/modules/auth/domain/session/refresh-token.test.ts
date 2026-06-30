/**
 * W0 (RED) - Tests para o agregado RefreshToken do modulo auth.
 *
 * Ticket: AUTH-AGG-SESSION. Decisoes: design-decisions.md DD-SESSION-01..03.
 * Estado computado por state(token, now); precedencia revoked>rotated>expired>active.
 *
 * Cobre CA4..CA14. DEVEM FALHAR em W0. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as RefreshToken from '#src/modules/auth/domain/session/refresh-token.ts';
import * as RefreshTokenId from '#src/modules/auth/domain/session/refresh-token-id.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

const ISSUED = new Date('2026-05-27T12:00:00.000Z');
const EXPIRES = new Date('2026-05-27T12:15:00.000Z');
const BEFORE_EXP = new Date('2026-05-27T12:10:00.000Z');
const AFTER_EXP = new Date('2026-05-27T12:20:00.000Z');

const issueOk = (): RefreshToken.RefreshToken => {
  const r = RefreshToken.issue({
    id: RefreshTokenId.generate(),
    userId: UserId.generate(),
    tokenHash: 'opaque-hash-value',
    issuedAt: ISSUED,
    expiresAt: EXPIRES,
  });
  if (!r.ok) throw new Error('setup issue');
  return r.value;
};

describe('RefreshToken.issue', () => {
  it('CA4: issue valido retorna ok com revokedAt/replacedBy null', () => {
    const r = RefreshToken.issue({
      id: RefreshTokenId.generate(),
      userId: UserId.generate(),
      tokenHash: 'h',
      issuedAt: ISSUED,
      expiresAt: EXPIRES,
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.revokedAt, null);
      assert.equal(r.value.replacedBy, null);
    }
  });

  it('CA5: tokenHash vazio retorna err refresh-token-hash-empty', () => {
    const r = RefreshToken.issue({
      id: RefreshTokenId.generate(),
      userId: UserId.generate(),
      tokenHash: '   ',
      issuedAt: ISSUED,
      expiresAt: EXPIRES,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'refresh-token-hash-empty');
  });

  it('CA6: expiresAt <= issuedAt retorna err refresh-token-expiry-before-issue', () => {
    const r = RefreshToken.issue({
      id: RefreshTokenId.generate(),
      userId: UserId.generate(),
      tokenHash: 'h',
      issuedAt: ISSUED,
      expiresAt: ISSUED,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'refresh-token-expiry-before-issue');
  });
});

describe('RefreshToken.state', () => {
  it('CA7: active antes de expirar', () => {
    assert.equal(RefreshToken.state(issueOk(), BEFORE_EXP), 'active');
  });

  it('CA8: expired apos expiresAt', () => {
    assert.equal(RefreshToken.state(issueOk(), AFTER_EXP), 'expired');
  });

  it('CA9: revoked tem precedencia sobre expired', () => {
    const revoked = RefreshToken.revoke(issueOk(), BEFORE_EXP);
    assert.equal(RefreshToken.state(revoked, AFTER_EXP), 'revoked');
  });

  it('CA10: rotated quando replacedBy setado', () => {
    const rotated = RefreshToken.rotate(issueOk(), RefreshTokenId.generate(), BEFORE_EXP);
    assert.equal(RefreshToken.state(rotated, BEFORE_EXP), 'rotated');
  });
});

describe('RefreshToken.revoke / rotate / verify', () => {
  it('CA11: revoke -> state revoked + verify err refresh-token-revoked', () => {
    const revoked = RefreshToken.revoke(issueOk(), BEFORE_EXP);
    assert.equal(RefreshToken.state(revoked, BEFORE_EXP), 'revoked');
    const v = RefreshToken.verify(revoked, BEFORE_EXP);
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.error, 'refresh-token-revoked');
  });

  it('CA12: rotate seta replacedBy + verify err refresh-token-rotated', () => {
    const replacement = RefreshTokenId.generate();
    const rotated = RefreshToken.rotate(issueOk(), replacement, BEFORE_EXP);
    assert.equal(rotated.replacedBy, replacement);
    const v = RefreshToken.verify(rotated, BEFORE_EXP);
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.error, 'refresh-token-rotated');
  });

  it('CA13: verify de token ativo retorna ok', () => {
    assert.equal(RefreshToken.verify(issueOk(), BEFORE_EXP).ok, true);
  });

  it('CA14: verify de token expirado retorna err refresh-token-expired', () => {
    const v = RefreshToken.verify(issueOk(), AFTER_EXP);
    assert.equal(v.ok, false);
    if (!v.ok) assert.equal(v.error, 'refresh-token-expired');
  });
});
