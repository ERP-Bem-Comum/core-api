/**
 * Use case `updateUserProfileContact` — altera name/telephone/avatarUrl.
 * rehydrate userRef → `findByUserRef` (not-found) → `UserProfile.updateContact` → `save`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as UserProfile from '#src/modules/partners/domain/user-profile/user-profile.ts';
import type { UserProfile as UserProfileEntity } from '#src/modules/partners/domain/user-profile/types.ts';
import type { UserProfileEvent } from '#src/modules/partners/domain/user-profile/events.ts';
import type { UserProfileError } from '#src/modules/partners/domain/user-profile/errors.ts';
import type {
  UserProfileRepository,
  UserProfileRepositoryError,
} from '#src/modules/partners/domain/user-profile/repository.ts';

export type UpdateUserProfileContactCommand = Readonly<{
  userRef: string;
  name: string;
  telephone: string;
  avatarUrl: string | null;
}>;

export type UpdateUserProfileContactError =
  | 'update-user-profile-invalid-user-ref'
  | 'update-user-profile-not-found'
  | UserProfileError
  | UserProfileRepositoryError;

export type UpdateUserProfileContactOutput = Readonly<{
  profile: UserProfileEntity;
  event: UserProfileEvent;
}>;

type Deps = Readonly<{ userProfileRepo: UserProfileRepository; clock: Clock }>;

export const updateUserProfileContact =
  (deps: Deps) =>
  async (
    cmd: UpdateUserProfileContactCommand,
  ): Promise<Result<UpdateUserProfileContactOutput, UpdateUserProfileContactError>> => {
    const userRef = UserRef.rehydrate(cmd.userRef);
    if (!userRef.ok) return err('update-user-profile-invalid-user-ref');

    const fetched = await deps.userProfileRepo.findByUserRef(userRef.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('update-user-profile-not-found');

    const updated = UserProfile.updateContact(
      fetched.value,
      { name: cmd.name, telephone: cmd.telephone, avatarUrl: cmd.avatarUrl },
      deps.clock.now(),
    );
    if (!updated.ok) return updated;

    const saved = await deps.userProfileRepo.save(updated.value.profile);
    if (!saved.ok) return saved;

    return ok({ profile: updated.value.profile, event: updated.value.event });
  };
