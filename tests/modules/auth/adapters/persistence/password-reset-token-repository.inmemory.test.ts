/**
 * CTR-AUTH-RESET-PERSISTENCE — W0/W1 — InMemory PasswordResetTokenRepository. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeInMemoryPasswordResetTokenStore } from '#src/modules/auth/adapters/persistence/repos/password-reset-token-repository.in-memory.ts';
import * as ResetToken from '#src/modules/auth/domain/session/password-reset-token.ts';
import * as ResetTokenId from '#src/modules/auth/domain/session/password-reset-token-id.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

const REQUESTED = new Date('2026-05-30T12:00:00.000Z');
const EXPIRES = new Date('2026-05-30T12:15:00.000Z');

const issue = (userId: UserId.UserId, tokenHash: string) => {
  const t = ResetToken.issue({
    id: ResetTokenId.generate(),
    userId,
    tokenHash,
    requestedAt: REQUESTED,
    expiresAt: EXPIRES,
  });
  if (!t.ok) throw new Error('setup');
  return t.value;
};

describe('InMemory PasswordResetTokenRepository', () => {
  it('save + findByTokenHash devolve o token; hash inexistente -> null', async () => {
    const { repository } = makeInMemoryPasswordResetTokenStore();
    const user = UserId.generate();
    const token = issue(user, 'sha256:hash-A');
    assert.equal((await repository.save(token)).ok, true);

    const found = await repository.findByTokenHash('sha256:hash-A');
    assert.equal(found.ok, true);
    if (found.ok) assert.equal(found.value?.tokenHash, 'sha256:hash-A');

    const missing = await repository.findByTokenHash('sha256:nope');
    assert.equal(missing.ok, true);
    if (missing.ok) assert.equal(missing.value, null);
  });

  it('findUnusedByUserId retorna só os não consumidos do usuário', async () => {
    const { repository } = makeInMemoryPasswordResetTokenStore();
    const user = UserId.generate();
    const other = UserId.generate();

    const unused = issue(user, 'sha256:unused');
    const consumed = ResetToken.consume(issue(user, 'sha256:used'), REQUESTED);
    if (!consumed.ok) throw new Error('setup');
    await repository.save(unused);
    await repository.save(consumed.value);
    await repository.save(issue(other, 'sha256:other'));

    const r = await repository.findUnusedByUserId(user);
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.length, 1);
      assert.equal(r.value[0]?.tokenHash, 'sha256:unused');
    }
  });
});
