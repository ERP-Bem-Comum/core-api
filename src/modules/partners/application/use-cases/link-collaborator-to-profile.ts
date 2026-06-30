/**
 * Use case `linkCollaboratorToProfile` — vincula um colaborador ao perfil.
 * rehydrate userRef → `findByUserRef` (not-found) → rehydrate collaboratorId →
 * `UserProfile.linkCollaborator` → `save`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as UserProfile from '#src/modules/partners/domain/user-profile/user-profile.ts';
import type { UserProfile as UserProfileEntity } from '#src/modules/partners/domain/user-profile/types.ts';
import type { UserProfileEvent } from '#src/modules/partners/domain/user-profile/events.ts';
import type { UserProfileError } from '#src/modules/partners/domain/user-profile/errors.ts';
import type {
  UserProfileRepository,
  UserProfileRepositoryError,
} from '#src/modules/partners/domain/user-profile/repository.ts';

export type LinkCollaboratorToProfileCommand = Readonly<{
  userRef: string;
  collaboratorId: string;
}>;

export type LinkCollaboratorToProfileError =
  | 'link-collaborator-invalid-user-ref'
  | 'link-collaborator-not-found'
  | 'link-collaborator-invalid-collaborator-id'
  | UserProfileError
  | UserProfileRepositoryError;

export type LinkCollaboratorToProfileOutput = Readonly<{
  profile: UserProfileEntity;
  event: UserProfileEvent;
}>;

type Deps = Readonly<{ userProfileRepo: UserProfileRepository; clock: Clock }>;

export const linkCollaboratorToProfile =
  (deps: Deps) =>
  async (
    cmd: LinkCollaboratorToProfileCommand,
  ): Promise<Result<LinkCollaboratorToProfileOutput, LinkCollaboratorToProfileError>> => {
    const userRef = UserRef.rehydrate(cmd.userRef);
    if (!userRef.ok) return err('link-collaborator-invalid-user-ref');

    const collaboratorRef = CollaboratorId.rehydrate(cmd.collaboratorId);
    if (!collaboratorRef.ok) return err('link-collaborator-invalid-collaborator-id');

    const fetched = await deps.userProfileRepo.findByUserRef(userRef.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('link-collaborator-not-found');

    const linked = UserProfile.linkCollaborator(
      fetched.value,
      collaboratorRef.value,
      deps.clock.now(),
    );
    if (!linked.ok) return linked;

    const saved = await deps.userProfileRepo.save(linked.value.profile);
    if (!saved.ok) return saved;

    return ok({ profile: linked.value.profile, event: linked.value.event });
  };
