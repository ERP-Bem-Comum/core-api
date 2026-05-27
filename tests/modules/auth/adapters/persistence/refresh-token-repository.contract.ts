/**
 * Suite de contrato compartilhada para RefreshTokenRepository (modulo auth).
 * Parametrizada; NAO executa direto. Setup sync-ou-async. ASCII puro.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import type { RefreshTokenRepository } from '#src/modules/auth/domain/session/refresh-token-repository.ts';
import type { RefreshToken } from '#src/modules/auth/domain/session/refresh-token.ts';
import * as RefreshTokenAgg from '#src/modules/auth/domain/session/refresh-token.ts';
import * as RefreshTokenId from '#src/modules/auth/domain/session/refresh-token-id.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';

interface RefreshTokenRepoSetup {
  repository: RefreshTokenRepository;
  teardown?: () => Promise<void>;
}

export interface RefreshTokenRepoFactory {
  make: () => RefreshTokenRepoSetup | Promise<RefreshTokenRepoSetup>;
}

const ISSUED = new Date('2026-05-27T12:00:00.000Z');
const EXPIRES = new Date('2026-05-27T12:15:00.000Z');

const buildToken = (tokenHash: string): RefreshToken => {
  const r = RefreshTokenAgg.issue({
    id: RefreshTokenId.generate(),
    userId: UserId.generate(),
    tokenHash,
    issuedAt: ISSUED,
    expiresAt: EXPIRES,
  });
  if (!r.ok) throw new Error('fixture token');
  return r.value;
};

export const runRefreshTokenRepositoryContract = (
  label: string,
  factory: RefreshTokenRepoFactory,
): void => {
  describe(`RefreshTokenRepository contract — ${label}`, () => {
    let repository: RefreshTokenRepository;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repository = built.repository;
      teardown = built.teardown;
    });

    const cleanup = async (): Promise<void> => {
      if (teardown) await teardown();
    };

    it('CA1: save -> findById retorna o token', async () => {
      const token = buildToken('hash-aaa');
      const saved = await repository.save(token);
      assert.equal(saved.ok, true);
      const found = await repository.findById(token.id);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value?.id, token.id);
      await cleanup();
    });

    it('CA2: findById inexistente retorna ok(null)', async () => {
      const found = await repository.findById(RefreshTokenId.generate());
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value, null);
      await cleanup();
    });

    it('CA3: save -> findByTokenHash retorna o token', async () => {
      const token = buildToken('hash-bbb');
      await repository.save(token);
      const found = await repository.findByTokenHash('hash-bbb');
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value?.id, token.id);
      await cleanup();
    });

    it('CA4: findByTokenHash inexistente retorna ok(null)', async () => {
      const found = await repository.findByTokenHash('inexistente');
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value, null);
      await cleanup();
    });

    it('CA5: save de mesmo id faz upsert (revogacao refletida)', async () => {
      const token = buildToken('hash-ccc');
      await repository.save(token);
      const revoked = RefreshTokenAgg.revoke(token, ISSUED);
      await repository.save(revoked);
      const found = await repository.findById(token.id);
      assert.equal(found.ok, true);
      if (found.ok) assert.notEqual(found.value?.revokedAt, null);
      await cleanup();
    });
  });
};
