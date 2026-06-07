/**
 * W0 (RED) - setProfilePhoto / removeProfilePhoto (modulo auth, US6 da spec 005; FR-012).
 *
 * Cobre CA1..CA7: upload valido, MIME rejeitado, tamanho, vazio, not-found, falha de storage, remove.
 * DEVE FALHAR em W0 - set-profile-photo.ts e o port ProfilePhotoStorage ainda nao existem. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import {
  setProfilePhoto,
  removeProfilePhoto,
} from '#src/modules/auth/application/use-cases/set-profile-photo.ts';
import type { ProfilePhotoStorage } from '#src/modules/auth/application/ports/profile-photo-storage.ts';
import type {
  UserReader,
  UserRepository,
} from '#src/modules/auth/domain/identity/user/repository.ts';
import type { User } from '#src/modules/auth/domain/identity/user/types.ts';
import * as UserAgg from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import { ClockFixed } from '#src/shared/adapters/clock-fixed.ts';

const AT = new Date('2026-06-07T12:00:00.000Z');
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]); // header JPEG + bytes

const mkUser = (): User => {
  const e = Email.parse('amanda@x.com');
  const h = PasswordHash.fromString('$argon2id$x');
  if (!e.ok || !h.ok) throw new Error('setup');
  return UserAgg.register(
    { id: UserId.generate(), email: e.value, passwordHash: h.value, roles: [] },
    AT,
  ).user;
};

interface Captured {
  uploaded: { key: string; mimeType: string; size: number } | null;
  removed: string | null;
  saved: User | null;
}

const makeDeps = (users: readonly User[], opts?: { storageFails?: boolean }) => {
  const captured: Captured = { uploaded: null, removed: null, saved: null };
  const userReader: UserReader = {
    findById: (id) => Promise.resolve(ok(users.find((u) => u.id === id) ?? null)),
    findByEmail: () => Promise.resolve(ok(null)),
  };
  const userRepo: UserRepository = {
    save: (user) => {
      captured.saved = user;
      return Promise.resolve(ok(undefined));
    },
  };
  const storage: ProfilePhotoStorage = {
    upload: (input) => {
      if (opts?.storageFails) return Promise.resolve(err('photo-storage-unavailable' as const));
      captured.uploaded = { key: input.key, mimeType: input.mimeType, size: input.bytes.length };
      return Promise.resolve(ok(undefined));
    },
    remove: (key) => {
      captured.removed = key;
      return Promise.resolve(ok(undefined));
    },
  };
  return { deps: { userReader, userRepo, storage, clock: ClockFixed(AT) }, captured };
};

describe('setProfilePhoto', () => {
  it('CA1: foto valida -> upload em users/<id> + save com photo + evento', async () => {
    const u = mkUser();
    const { deps, captured } = makeDeps([u]);

    const r = await setProfilePhoto(deps)({
      targetId: String(u.id),
      bytes: JPEG,
      mimeType: 'image/jpeg',
    });

    assert.equal(r.ok, true);
    assert.equal(captured.uploaded?.key, `users/${String(u.id)}`);
    assert.equal(captured.uploaded?.mimeType, 'image/jpeg');
    assert.equal(captured.saved?.photo === null, false);
    if (r.ok) assert.equal(r.value.event.type, 'UserProfileUpdated');
  });

  it('CA2: MIME fora da allowlist -> photo-type-unsupported; sem upload/save', async () => {
    const u = mkUser();
    const { deps, captured } = makeDeps([u]);
    const r = await setProfilePhoto(deps)({
      targetId: String(u.id),
      bytes: JPEG,
      mimeType: 'application/pdf',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'photo-type-unsupported');
    assert.equal(captured.uploaded, null);
    assert.equal(captured.saved, null);
  });

  it('CA3: bytes > 5 MiB -> photo-too-large', async () => {
    const u = mkUser();
    const { deps, captured } = makeDeps([u]);
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    big.set(JPEG, 0);
    const r = await setProfilePhoto(deps)({
      targetId: String(u.id),
      bytes: big,
      mimeType: 'image/jpeg',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'photo-too-large');
    assert.equal(captured.uploaded, null);
  });

  it('CA4: bytes vazios -> photo-empty', async () => {
    const u = mkUser();
    const { deps } = makeDeps([u]);
    const r = await setProfilePhoto(deps)({
      targetId: String(u.id),
      bytes: new Uint8Array(0),
      mimeType: 'image/png',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'photo-empty');
  });

  it('CA5: id inexistente -> user-not-found; sem upload', async () => {
    const { deps, captured } = makeDeps([]);
    const r = await setProfilePhoto(deps)({
      targetId: String(UserId.generate()),
      bytes: JPEG,
      mimeType: 'image/jpeg',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-not-found');
    assert.equal(captured.uploaded, null);
  });

  it('CA6: falha no storage -> photo-storage-unavailable; sem save', async () => {
    const u = mkUser();
    const { deps, captured } = makeDeps([u], { storageFails: true });
    const r = await setProfilePhoto(deps)({
      targetId: String(u.id),
      bytes: JPEG,
      mimeType: 'image/jpeg',
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'photo-storage-unavailable');
    assert.equal(captured.saved, null);
  });
});

describe('removeProfilePhoto', () => {
  it('CA7: remove -> storage.remove chamado + save com photo=null', async () => {
    const u = mkUser();
    const { deps, captured } = makeDeps([u]);
    // primeiro define uma foto para haver o que remover
    await setProfilePhoto(deps)({ targetId: String(u.id), bytes: JPEG, mimeType: 'image/jpeg' });

    const r = await removeProfilePhoto(deps)({ targetId: String(u.id) });

    assert.equal(r.ok, true);
    assert.equal(captured.removed, `users/${String(u.id)}`);
    assert.equal(captured.saved?.photo, null);
  });
});
