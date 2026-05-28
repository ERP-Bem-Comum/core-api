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
  // Insere o auth_user pai (FK auth_rt_user_fk). Idempotente. Drizzle implementa; InMemory no-op.
  // Padrão do amendment-repository.suite.ts (seedContract). Chamado antes de cada save.
  seedUser: (userId: UserId.UserId) => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface RefreshTokenRepoFactory {
  make: () => RefreshTokenRepoSetup | Promise<RefreshTokenRepoSetup>;
}

const ISSUED = new Date('2026-05-27T12:00:00.000Z');
const EXPIRES = new Date('2026-05-27T12:15:00.000Z');
// Janela inteiramente no passado relativo a ISSUED -> token "expirado" mas com revokedAt === null.
const PAST_ISSUED = new Date('2026-05-27T11:00:00.000Z');
const PAST_EXPIRES = new Date('2026-05-27T11:15:00.000Z');

const buildTokenFor = (
  userId: UserId.UserId,
  tokenHash: string,
  issuedAt: Date = ISSUED,
  expiresAt: Date = EXPIRES,
): RefreshToken => {
  const r = RefreshTokenAgg.issue({
    id: RefreshTokenId.generate(),
    userId,
    tokenHash,
    issuedAt,
    expiresAt,
  });
  if (!r.ok) throw new Error('fixture token');
  return r.value;
};

const buildToken = (tokenHash: string): RefreshToken => buildTokenFor(UserId.generate(), tokenHash);

export const runRefreshTokenRepositoryContract = (
  label: string,
  factory: RefreshTokenRepoFactory,
): void => {
  describe(`RefreshTokenRepository contract — ${label}`, () => {
    let repository: RefreshTokenRepository;
    let seedUser: (userId: UserId.UserId) => Promise<void>;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repository = built.repository;
      seedUser = built.seedUser;
      teardown = built.teardown;
    });

    const cleanup = async (): Promise<void> => {
      if (teardown) await teardown();
    };

    // Seedeia o auth_user pai (FK) antes de salvar o token. Idempotente.
    const seedAndSave = async (token: RefreshToken): ReturnType<RefreshTokenRepository['save']> => {
      await seedUser(token.userId);
      return repository.save(token);
    };

    it('CA1: save -> findById retorna o token', async () => {
      const token = buildToken('hash-aaa');
      const saved = await seedAndSave(token);
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
      await seedAndSave(token);
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
      await seedAndSave(token);
      const revoked = RefreshTokenAgg.revoke(token, ISSUED);
      await seedAndSave(revoked);
      const found = await repository.findById(token.id);
      assert.equal(found.ok, true);
      if (found.ok) assert.notEqual(found.value?.revokedAt, null);
      await cleanup();
    });

    it('A6a/CA5: findRevocableByUserId sem tokens do usuario retorna []', async () => {
      const res = await repository.findRevocableByUserId(UserId.generate());
      assert.equal(res.ok, true);
      if (res.ok) assert.deepEqual([...res.value], []);
      await cleanup();
    });

    it('A6a/CA6: findRevocableByUserId retorna apenas tokens do userId informado', async () => {
      const alvo = UserId.generate();
      const outro = UserId.generate();
      await seedAndSave(buildTokenFor(alvo, 'h-alvo'));
      await seedAndSave(buildTokenFor(outro, 'h-outro'));
      const res = await repository.findRevocableByUserId(alvo);
      assert.equal(res.ok, true);
      if (res.ok) {
        assert.equal(res.value.length, 1);
        assert.equal(res.value[0]?.userId, alvo);
      }
      await cleanup();
    });

    it('A6a/CA7: inclui active/expired/rotated (revokedAt === null); exclui revoked', async () => {
      const u = UserId.generate();
      const active = buildTokenFor(u, 'h-active');
      const expired = buildTokenFor(u, 'h-expired', PAST_ISSUED, PAST_EXPIRES);
      const rotated = RefreshTokenAgg.rotate(
        buildTokenFor(u, 'h-rotated'),
        RefreshTokenId.generate(),
        ISSUED,
      );
      const revoked = RefreshTokenAgg.revoke(buildTokenFor(u, 'h-revoked'), ISSUED);
      await seedAndSave(active);
      await seedAndSave(expired);
      await seedAndSave(rotated);
      await seedAndSave(revoked);
      const res = await repository.findRevocableByUserId(u);
      assert.equal(res.ok, true);
      if (res.ok) {
        const hashes = res.value.map((t) => t.tokenHash).sort();
        assert.deepEqual(hashes, ['h-active', 'h-expired', 'h-rotated']);
      }
      await cleanup();
    });
  });
};
