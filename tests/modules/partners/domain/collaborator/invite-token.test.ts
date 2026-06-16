/**
 * PAR-COLLABORATOR-SELF-REGISTER — W0 (RED) — agregado CollaboratorInviteToken (#43).
 *
 * Espelha password-reset-token do auth: issue (valida hash/expiry), state (precedência
 * used > expired > pending) e consume (one-time: só no estado pending).
 * DEVE FALHAR: o módulo de domínio do token ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
import * as InviteTokenId from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

const requestedAt = new Date('2026-06-16T10:00:00.000Z');
const expiresAt = new Date('2026-06-16T10:15:00.000Z');

const issueValid = () =>
  InviteToken.issue({
    id: InviteTokenId.generate(),
    collaboratorId: CollaboratorId.generate(),
    tokenHash: 'a'.repeat(64),
    requestedAt,
    expiresAt,
  });

describe('CollaboratorInviteToken — issue', () => {
  it('emite com used_at null quando hash e janela são válidos', () => {
    const r = issueValid();
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.usedAt, null);
      assert.equal(r.value.tokenHash, 'a'.repeat(64));
    }
  });

  it('rejeita hash vazio', () => {
    const r = InviteToken.issue({
      id: InviteTokenId.generate(),
      collaboratorId: CollaboratorId.generate(),
      tokenHash: '   ',
      requestedAt,
      expiresAt,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invite-token-hash-empty');
  });

  it('rejeita expiry <= requestedAt', () => {
    const r = InviteToken.issue({
      id: InviteTokenId.generate(),
      collaboratorId: CollaboratorId.generate(),
      tokenHash: 'a'.repeat(64),
      requestedAt,
      expiresAt: requestedAt,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'invite-token-expiry-before-request');
  });
});

describe('CollaboratorInviteToken — state', () => {
  it('pending antes do TTL', () => {
    const r = issueValid();
    assert.ok(r.ok);
    if (r.ok) assert.equal(InviteToken.state(r.value, requestedAt), 'pending');
  });

  it('expired quando now >= expiresAt', () => {
    const r = issueValid();
    assert.ok(r.ok);
    if (r.ok) assert.equal(InviteToken.state(r.value, expiresAt), 'expired');
  });

  it('used tem precedência sobre expired', () => {
    const r = issueValid();
    assert.ok(r.ok);
    if (r.ok) {
      const used = { ...r.value, usedAt: requestedAt };
      assert.equal(InviteToken.state(used, expiresAt), 'used');
    }
  });
});

describe('CollaboratorInviteToken — consume (one-time)', () => {
  it('pending -> used marca usedAt', () => {
    const r = issueValid();
    assert.ok(r.ok);
    if (r.ok) {
      const consumed = InviteToken.consume(r.value, requestedAt);
      assert.equal(consumed.ok, true);
      if (consumed.ok) assert.deepEqual(consumed.value.usedAt, requestedAt);
    }
  });

  it('segundo consume falha (invite-token-used)', () => {
    const r = issueValid();
    assert.ok(r.ok);
    if (r.ok) {
      const first = InviteToken.consume(r.value, requestedAt);
      assert.ok(first.ok);
      if (first.ok) {
        const second = InviteToken.consume(first.value, requestedAt);
        assert.equal(second.ok, false);
        if (!second.ok) assert.equal(second.error, 'invite-token-used');
      }
    }
  });

  it('consume de token expirado falha (invite-token-expired)', () => {
    const r = issueValid();
    assert.ok(r.ok);
    if (r.ok) {
      const consumed = InviteToken.consume(r.value, expiresAt);
      assert.equal(consumed.ok, false);
      if (!consumed.ok) assert.equal(consumed.error, 'invite-token-expired');
    }
  });
});
