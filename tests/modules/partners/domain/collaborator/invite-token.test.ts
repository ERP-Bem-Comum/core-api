/**
 * PAR-COLLABORATOR-SELF-REGISTRATION (US5). Domínio do token de convite (uso-único + TTL).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
import * as InviteTokenId from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

const ISSUED = new Date('2026-01-10T08:00:00.000Z');
const EXPIRES = new Date('2026-01-17T08:00:00.000Z'); // +7 dias
const AFTER = new Date('2026-01-18T08:00:00.000Z');

const issued = () => {
  const r = InviteToken.issue({
    id: InviteTokenId.generate(),
    collaboratorId: CollaboratorId.generate(),
    tokenHash: 'a'.repeat(64),
    issuedAt: ISSUED,
    expiresAt: EXPIRES,
  });
  assert.ok(r.ok, `issue: ${r.ok ? '' : r.error}`);
  return r.value;
};

describe('CollaboratorInviteToken (US5)', () => {
  it('issue com expiresAt <= issuedAt → invite-token-expiry-before-issue', () => {
    const r = InviteToken.issue({
      id: InviteTokenId.generate(),
      collaboratorId: CollaboratorId.generate(),
      tokenHash: 'x'.repeat(64),
      issuedAt: ISSUED,
      expiresAt: ISSUED,
    });
    assert.ok(!r.ok);
    assert.equal(r.error, 'invite-token-expiry-before-issue');
  });

  it('state: pending dentro do TTL, expired após', () => {
    const t = issued();
    assert.equal(InviteToken.state(t, ISSUED), 'pending');
    assert.equal(InviteToken.state(t, AFTER), 'expired');
  });

  it('consume uso-único: pending → ok (usedAt); 2º consume → invite-token-used', () => {
    const t = issued();
    const first = InviteToken.consume(t, ISSUED);
    assert.ok(first.ok);
    if (first.ok) {
      assert.notEqual(first.value.usedAt, null);
      const second = InviteToken.consume(first.value, ISSUED);
      assert.ok(!second.ok);
      assert.equal(second.error, 'invite-token-used');
    }
  });

  it('consume após expiração → invite-token-expired', () => {
    const r = InviteToken.consume(issued(), AFTER);
    assert.ok(!r.ok);
    assert.equal(r.error, 'invite-token-expired');
  });
});
