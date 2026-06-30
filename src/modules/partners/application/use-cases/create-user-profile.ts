/**
 * Use case `createUserProfile` — cria o perfil de um usuário (1:1 com auth.User).
 * rehydrate userRef → `UserProfile.create` → guard de userRef já existente e cpf
 * duplicado → `save`. Tempo via `Clock`. Curried `(deps) => (cmd)`.
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

export type CreateUserProfileCommand = Readonly<{
  userRef: string;
  name: string;
  cpf: string;
  telephone: string;
  avatarUrl: string | null;
}>;

export type CreateUserProfileError =
  | 'create-user-profile-invalid-user-ref'
  | 'create-user-profile-already-exists'
  | 'create-user-profile-cpf-duplicate'
  | UserProfileError
  | UserProfileRepositoryError;

export type CreateUserProfileOutput = Readonly<{
  profile: UserProfileEntity;
  event: UserProfileEvent;
}>;

type Deps = Readonly<{ userProfileRepo: UserProfileRepository; clock: Clock }>;

export const createUserProfile =
  (deps: Deps) =>
  async (
    cmd: CreateUserProfileCommand,
  ): Promise<Result<CreateUserProfileOutput, CreateUserProfileError>> => {
    const userRef = UserRef.rehydrate(cmd.userRef);
    if (!userRef.ok) return err('create-user-profile-invalid-user-ref');

    const created = UserProfile.create({
      userRef: userRef.value,
      name: cmd.name,
      cpf: cmd.cpf,
      telephone: cmd.telephone,
      avatarUrl: cmd.avatarUrl,
      createdAt: deps.clock.now(),
    });
    if (!created.ok) return created;

    const existing = await deps.userProfileRepo.findByUserRef(userRef.value);
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('create-user-profile-already-exists');

    const byCpf = await deps.userProfileRepo.findByCpf(created.value.profile.cpf);
    if (!byCpf.ok) return byCpf;
    if (byCpf.value !== null) return err('create-user-profile-cpf-duplicate');

    const saved = await deps.userProfileRepo.save(created.value.profile);
    if (!saved.ok) return saved;

    return ok({ profile: created.value.profile, event: created.value.event });
  };
