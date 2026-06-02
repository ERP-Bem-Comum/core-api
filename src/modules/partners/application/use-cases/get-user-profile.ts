/**
 * Query `getUserProfile` — busca o perfil por `userRef`. `null` = não encontrado (não-erro).
 */

import { type Result, err } from '#src/shared/index.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import type { UserProfile } from '#src/modules/partners/domain/user-profile/types.ts';
import type {
  UserProfileRepository,
  UserProfileRepositoryError,
} from '#src/modules/partners/domain/user-profile/repository.ts';

export type GetUserProfileCommand = Readonly<{ userRef: string }>;

export type GetUserProfileError = 'get-user-profile-invalid-user-ref' | UserProfileRepositoryError;

type Deps = Readonly<{ userProfileRepo: UserProfileRepository }>;

export const getUserProfile =
  (deps: Deps) =>
  async (cmd: GetUserProfileCommand): Promise<Result<UserProfile | null, GetUserProfileError>> => {
    const userRef = UserRef.rehydrate(cmd.userRef);
    if (!userRef.ok) return err('get-user-profile-invalid-user-ref');
    return deps.userProfileRepo.findByUserRef(userRef.value);
  };
