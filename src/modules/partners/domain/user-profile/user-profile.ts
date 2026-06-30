/**
 * Operações do agregado `UserProfile`. Consumir via `import * as UserProfile`.
 * IDs/instantes injetados; `cpf` imutável após `create`.
 *
 *   - `create` — valida name/telephone/cpf; nasce sem vínculo de colaborador.
 *   - `updateContact` — altera name/telephone/avatarUrl (cpf/userRef preservados).
 *   - `linkCollaborator` — seta o vínculo ao colaborador.
 *   - `rehydrate` — reconstrói estado persistido, sem evento.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { UserProfileEvent } from './events.ts';
import type { UserProfileError } from './errors.ts';
import type {
  CreateUserProfileInput,
  RehydrateUserProfileInput,
  UpdateContactInput,
  UserProfile,
} from './types.ts';

const isBlank = (s: string): boolean => s.trim().length === 0;

export const create = (
  input: CreateUserProfileInput,
): Result<{ profile: UserProfile; event: UserProfileEvent }, UserProfileError> => {
  if (isBlank(input.name)) return err('user-profile-name-required');
  if (isBlank(input.telephone)) return err('user-profile-telephone-required');

  const cpf = Cpf.parse(input.cpf);
  if (!cpf.ok) return err('invalid-cpf');

  const profile: UserProfile = immutable({
    userRef: input.userRef,
    name: input.name.trim(),
    cpf: cpf.value,
    telephone: input.telephone.trim(),
    avatarUrl: input.avatarUrl,
    collaboratorRef: null,
  });

  return ok({
    profile,
    event: { type: 'UserProfileCreated', userRef: profile.userRef, occurredAt: input.createdAt },
  });
};

export const updateContact = (
  profile: UserProfile,
  input: UpdateContactInput,
  at: Date,
): Result<{ profile: UserProfile; event: UserProfileEvent }, UserProfileError> => {
  if (isBlank(input.name)) return err('user-profile-name-required');
  if (isBlank(input.telephone)) return err('user-profile-telephone-required');

  const updated: UserProfile = immutable({
    ...profile,
    name: input.name.trim(),
    telephone: input.telephone.trim(),
    avatarUrl: input.avatarUrl,
  });

  return ok({
    profile: updated,
    event: { type: 'UserProfileContactUpdated', userRef: profile.userRef, occurredAt: at },
  });
};

export const linkCollaborator = (
  profile: UserProfile,
  collaboratorRef: CollaboratorId,
  at: Date,
): Result<{ profile: UserProfile; event: UserProfileEvent }, UserProfileError> => {
  const linked: UserProfile = immutable({ ...profile, collaboratorRef });
  return ok({
    profile: linked,
    event: {
      type: 'UserProfileCollaboratorLinked',
      userRef: profile.userRef,
      collaboratorRef,
      occurredAt: at,
    },
  });
};

export const rehydrate = (
  input: RehydrateUserProfileInput,
): Result<UserProfile, UserProfileError> => ok(immutable({ ...input }));
