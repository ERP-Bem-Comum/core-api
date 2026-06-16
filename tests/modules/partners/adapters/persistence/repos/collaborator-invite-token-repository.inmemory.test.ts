/**
 * PAR-COLLABORATOR-SELF-REGISTER — W0 (RED) — repo InMemory do invite token (#43).
 *
 * save / findByTokenHash / findUnusedByCollaboratorId (used_at IS NULL).
 * DEVE FALHAR: o store InMemory ainda não existe.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeInMemoryCollaboratorInviteTokenStore } from '#src/modules/partners/adapters/persistence/repos/collaborator-invite-token-repository.in-memory.ts';
import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
import * as InviteTokenId from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

const requestedAt = new Date('2026-06-16T10:00:00.000Z');
const expiresAt = new Date('2026-06-16T10:15:00.000Z');

const issue = (collaboratorId: ReturnType<typeof CollaboratorId.generate>, tokenHash: string) => {
  const r = InviteToken.issue({
    id: InviteTokenId.generate(),
    collaboratorId,
    tokenHash,
    requestedAt,
    expiresAt,
  });
  assert.ok(r.ok);
  return r.value;
};

describe('InMemory CollaboratorInviteTokenRepository', () => {
  it('save + findByTokenHash recupera o token', async () => {
    const { repository } = makeInMemoryCollaboratorInviteTokenStore();
    const collaboratorId = CollaboratorId.generate();
    const token = issue(collaboratorId, 'b'.repeat(64));

    const saved = await repository.save(token);
    assert.ok(saved.ok);

    const found = await repository.findByTokenHash('b'.repeat(64));
    assert.ok(found.ok);
    if (found.ok) assert.equal(found.value?.id, token.id);
  });

  it('findByTokenHash retorna null quando não existe', async () => {
    const { repository } = makeInMemoryCollaboratorInviteTokenStore();
    const found = await repository.findByTokenHash('c'.repeat(64));
    assert.ok(found.ok);
    if (found.ok) assert.equal(found.value, null);
  });

  it('findUnusedByCollaboratorId retorna só os pending (used_at IS NULL)', async () => {
    const { repository } = makeInMemoryCollaboratorInviteTokenStore();
    const collaboratorId = CollaboratorId.generate();
    const pending = issue(collaboratorId, 'd'.repeat(64));
    const used = { ...issue(collaboratorId, 'e'.repeat(64)), usedAt: requestedAt };
    await repository.save(pending);
    await repository.save(used);

    const unused = await repository.findUnusedByCollaboratorId(collaboratorId);
    assert.ok(unused.ok);
    if (unused.ok) {
      assert.equal(unused.value.length, 1);
      assert.equal(unused.value[0]?.id, pending.id);
    }
  });
});
