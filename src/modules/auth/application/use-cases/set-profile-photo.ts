/**
 * setProfilePhoto / removeProfilePhoto - use cases do modulo auth (spec 005, US6; FR-012).
 * Imperative Shell (async, Result). Reusa o dominio User.setPhoto e o VO ProfilePhotoRef.
 *
 * Validacao tipo/tamanho na application (FR-012): MIME allowlist image/jpeg|png|webp; tamanho
 * 0 < bytes <= 5 MiB. Key deterministica `users/<userId>` -> troca sobrescreve (idempotente);
 * remove apaga essa key e zera o ref. Magic bytes ficam como defesa adicional na borda (HTTP).
 * Sequencia (set): validar id -> validar mime/size -> fetch (404) -> storage.upload -> setPhoto ->
 * persist. O upload precede o save: se o storage falhar, o agregado nao referencia objeto inexistente.
 * ASCII puro.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as ProfilePhotoRef from '#src/modules/auth/domain/identity/profile-photo-ref.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import type { User as UserType } from '#src/modules/auth/domain/identity/user/types.ts';
import type { UserProfileUpdated } from '#src/modules/auth/domain/identity/user/events.ts';
import type {
  UserReader,
  UserRepository,
  UserRepositoryError,
} from '#src/modules/auth/domain/identity/user/repository.ts';
import type {
  ProfilePhotoStorage,
  ProfilePhotoStorageError,
} from '#src/modules/auth/application/ports/profile-photo-storage.ts';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024; // 5 MiB

// Key deterministica: uma foto por usuario; troca sobrescreve, remove apaga.
const photoKey = (userId: string): string => `users/${userId}`;

type Deps = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  storage: ProfilePhotoStorage;
  clock: Clock;
}>;

export type SetProfilePhotoCommand = Readonly<{
  targetId: string;
  bytes: Uint8Array;
  mimeType: string;
}>;

export type SetProfilePhotoError =
  | 'user-id-invalid'
  | 'user-not-found'
  | 'photo-type-unsupported'
  | 'photo-empty'
  | 'photo-too-large'
  | ProfilePhotoRef.ProfilePhotoRefError
  | ProfilePhotoStorageError
  | UserRepositoryError;

export type SetProfilePhotoOutput = Readonly<{ user: UserType; event: UserProfileUpdated }>;

export const setProfilePhoto =
  (deps: Deps) =>
  // cmd.bytes e Uint8Array (sem variant readonly nativo); contrato: o use case nao muta os bytes.
  async (
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    cmd: SetProfilePhotoCommand,
  ): Promise<Result<SetProfilePhotoOutput, SetProfilePhotoError>> => {
    const idR = UserId.rehydrate(cmd.targetId);
    if (!idR.ok) return err('user-id-invalid');

    if (!ALLOWED_MIME.includes(cmd.mimeType as (typeof ALLOWED_MIME)[number])) {
      return err('photo-type-unsupported');
    }
    if (cmd.bytes.length === 0) return err('photo-empty');
    if (cmd.bytes.length > MAX_PHOTO_BYTES) return err('photo-too-large');

    const found = await deps.userReader.findById(idR.value);
    if (!found.ok) return found;
    if (found.value === null) return err('user-not-found');
    const current = found.value;

    const key = photoKey(cmd.targetId);
    const ref = ProfilePhotoRef.parse(key);
    if (!ref.ok) return ref;

    const uploaded = await deps.storage.upload({ key, bytes: cmd.bytes, mimeType: cmd.mimeType });
    if (!uploaded.ok) return uploaded;

    const { user, event } = User.setPhoto(current, ref.value, deps.clock.now());
    const saved = await deps.userRepo.save(user);
    if (!saved.ok) return saved;

    return ok({ user, event });
  };

export type RemoveProfilePhotoCommand = Readonly<{ targetId: string }>;

export type RemoveProfilePhotoError =
  | 'user-id-invalid'
  | 'user-not-found'
  | ProfilePhotoStorageError
  | UserRepositoryError;

export type RemoveProfilePhotoOutput = Readonly<{ user: UserType; event: UserProfileUpdated }>;

export const removeProfilePhoto =
  (deps: Deps) =>
  async (
    cmd: RemoveProfilePhotoCommand,
  ): Promise<Result<RemoveProfilePhotoOutput, RemoveProfilePhotoError>> => {
    const idR = UserId.rehydrate(cmd.targetId);
    if (!idR.ok) return err('user-id-invalid');

    const found = await deps.userReader.findById(idR.value);
    if (!found.ok) return found;
    if (found.value === null) return err('user-not-found');
    const current = found.value;

    // remove e idempotente no adapter (ausencia nao e erro).
    const removed = await deps.storage.remove(photoKey(cmd.targetId));
    if (!removed.ok) return removed;

    const { user, event } = User.setPhoto(current, null, deps.clock.now());
    const saved = await deps.userRepo.save(user);
    if (!saved.ok) return saved;

    return ok({ user, event });
  };
