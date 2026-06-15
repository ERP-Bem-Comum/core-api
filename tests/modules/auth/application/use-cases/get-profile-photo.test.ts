/**
 * W0 (RED) - getProfilePhoto (USR-ME-PHOTO-DISPLAY).
 *
 * Use case de leitura dos bytes da foto de perfil (servir a imagem que o USR-ME-PHOTO so faz upload).
 * DEVE FALHAR em W0 - get-profile-photo.ts e `download` no port ProfilePhotoStorage nao existem.
 * Sequencia esperada: validar id -> fetch user -> sem foto? user-photo-not-found -> storage.download.
 * ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import { getProfilePhoto } from '#src/modules/auth/application/use-cases/get-profile-photo.ts';
import type { ProfilePhotoStorage } from '#src/modules/auth/application/ports/profile-photo-storage.ts';
import type { UserReader } from '#src/modules/auth/domain/identity/user/repository.ts';
import type { User } from '#src/modules/auth/domain/identity/user/types.ts';
import * as UserAgg from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import * as ProfilePhotoRef from '#src/modules/auth/domain/identity/profile-photo-ref.ts';

const AT = new Date('2026-06-11T12:00:00.000Z');
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);

const mkUser = (): User => {
  const e = Email.parse('viewer@x.com');
  const h = PasswordHash.fromString('$argon2id$x');
  if (!e.ok || !h.ok) throw new Error('setup');
  return UserAgg.register(
    { id: UserId.generate(), email: e.value, passwordHash: h.value, roles: [] },
    AT,
  ).user;
};

const withPhoto = (user: User): User => {
  const ref = ProfilePhotoRef.parse(`users/${String(user.id)}`);
  if (!ref.ok) throw new Error('setup');
  return UserAgg.setPhoto(user, ref.value, AT).user;
};

type StorageBehavior = 'found' | 'missing' | 'unavailable';

const makeDeps = (users: readonly User[], behavior: StorageBehavior = 'found') => {
  const downloads: string[] = [];
  const userReader: UserReader = {
    findById: (id) => Promise.resolve(ok(users.find((u) => u.id === id) ?? null)),
    findByEmail: () => Promise.resolve(ok(null)),
  };
  const storage: ProfilePhotoStorage = {
    upload: () => Promise.resolve(ok(undefined)),
    remove: () => Promise.resolve(ok(undefined)),
    download: (key: string) => {
      downloads.push(key);
      if (behavior === 'missing') return Promise.resolve(err('photo-object-missing' as const));
      if (behavior === 'unavailable')
        return Promise.resolve(err('photo-storage-unavailable' as const));
      return Promise.resolve(ok({ bytes: JPEG, contentType: 'image/jpeg' }));
    },
  };
  return { deps: { userReader, storage }, downloads };
};

describe('getProfilePhoto', () => {
  it('CA-A: usuario com foto -> ok com bytes + contentType, download da key do ref', async () => {
    const u = withPhoto(mkUser());
    const { deps, downloads } = makeDeps([u]);

    const r = await getProfilePhoto(deps)({ targetId: String(u.id) });

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.value.bytes, JPEG);
      assert.equal(r.value.contentType, 'image/jpeg');
    }
    assert.deepEqual(downloads, [`users/${String(u.id)}`]);
  });

  it('CA-B: usuario sem foto -> user-photo-not-found; storage nao e consultado', async () => {
    const u = mkUser();
    const { deps, downloads } = makeDeps([u]);

    const r = await getProfilePhoto(deps)({ targetId: String(u.id) });

    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-photo-not-found');
    assert.equal(downloads.length, 0);
  });

  it('CA-C: id invalido -> user-id-invalid', async () => {
    const { deps } = makeDeps([]);
    const r = await getProfilePhoto(deps)({ targetId: 'nao-e-uuid' });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-id-invalid');
  });

  it('CA-D: usuario inexistente -> user-not-found', async () => {
    const { deps } = makeDeps([]);
    const r = await getProfilePhoto(deps)({ targetId: String(UserId.generate()) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'user-not-found');
  });

  it('CA-E: ref existe mas objeto sumiu do storage -> photo-object-missing', async () => {
    const u = withPhoto(mkUser());
    const { deps } = makeDeps([u], 'missing');
    const r = await getProfilePhoto(deps)({ targetId: String(u.id) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'photo-object-missing');
  });

  it('CA-F: storage indisponivel -> photo-storage-unavailable', async () => {
    const u = withPhoto(mkUser());
    const { deps } = makeDeps([u], 'unavailable');
    const r = await getProfilePhoto(deps)({ targetId: String(u.id) });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'photo-storage-unavailable');
  });
});
