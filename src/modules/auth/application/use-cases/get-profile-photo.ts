/**
 * getProfilePhoto - use case do modulo auth (USR-ME-PHOTO-DISPLAY).
 *
 * Devolve os bytes + contentType da foto de perfil para a borda HTTP servir
 * (GET /me/photo e GET /users/:id/photo) - contraparte de leitura do setProfilePhoto.
 * Sequencia: validar id -> fetch user (404) -> sem ref? user-photo-not-found ->
 * storage.download (objeto sumido -> photo-object-missing, mapeia 404 na borda). ASCII puro.
 */

import { type Result, err } from '#src/shared/primitives/result.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import type {
  UserReader,
  UserRepositoryError,
} from '#src/modules/auth/domain/identity/user/repository.ts';
import type {
  DownloadedPhoto,
  ProfilePhotoDownloadError,
  ProfilePhotoStorage,
} from '#src/modules/auth/application/ports/profile-photo-storage.ts';

type Deps = Readonly<{
  userReader: UserReader;
  storage: ProfilePhotoStorage;
}>;

export type GetProfilePhotoCommand = Readonly<{ targetId: string }>;

export type GetProfilePhotoOutput = DownloadedPhoto;

export type GetProfilePhotoError =
  | 'user-id-invalid'
  | 'user-not-found'
  | 'user-photo-not-found'
  | ProfilePhotoDownloadError
  | UserRepositoryError;

export const getProfilePhoto =
  (deps: Deps) =>
  async (
    cmd: GetProfilePhotoCommand,
  ): Promise<Result<GetProfilePhotoOutput, GetProfilePhotoError>> => {
    const idR = UserId.rehydrate(cmd.targetId);
    if (!idR.ok) return err('user-id-invalid');

    const found = await deps.userReader.findById(idR.value);
    if (!found.ok) return found;
    if (found.value === null) return err('user-not-found');

    if (found.value.photo === null) return err('user-photo-not-found');

    return deps.storage.download(String(found.value.photo));
  };
