// Mapper UserProfile: row MySQL ↔ agregado UserProfile (módulo partners).
//
//   - userProfileToInsert(p, now): NewUserProfileRow — achata o agregado; `now` injetado.
//   - userProfileFromRow(row): Result<UserProfile, UserProfileMapperError> — reidrata
//     userRef/cpf/collaboratorRef (nullable) na borda, delega a UserProfile.rehydrate.
//
// ADR-0014: só par_*; referência por ID (sem FK). Zero throw na borda.

import { type Result, err } from '#src/shared/primitives/result.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as UserProfile from '#src/modules/partners/domain/user-profile/user-profile.ts';
import type { UserProfile as UserProfileEntity } from '#src/modules/partners/domain/user-profile/types.ts';
import type { UserProfileRow, NewUserProfileRow } from '../schemas/mysql.ts';

export type UserProfileMapperError =
  | 'user-profile-mapper-invalid-user-ref'
  | 'user-profile-mapper-invalid-cpf'
  | 'user-profile-mapper-invalid-collaborator-ref'
  | 'user-profile-mapper-invalid-state';

export const userProfileToInsert = (profile: UserProfileEntity, now: Date): NewUserProfileRow => ({
  userRef: profile.userRef as unknown as string,
  name: profile.name,
  cpf: profile.cpf as unknown as string,
  telephone: profile.telephone,
  avatarUrl: profile.avatarUrl,
  collaboratorRef: profile.collaboratorRef as unknown as string | null,
  createdAt: now,
  updatedAt: now,
});

export const userProfileFromRow = (
  row: Readonly<UserProfileRow>,
): Result<UserProfileEntity, UserProfileMapperError> => {
  const userRef = UserRef.rehydrate(row.userRef);
  if (!userRef.ok) return err('user-profile-mapper-invalid-user-ref');

  const cpf = Cpf.parse(row.cpf);
  if (!cpf.ok) return err('user-profile-mapper-invalid-cpf');

  let collaboratorRef = null;
  if (row.collaboratorRef !== null) {
    const parsed = CollaboratorId.rehydrate(row.collaboratorRef);
    if (!parsed.ok) return err('user-profile-mapper-invalid-collaborator-ref');
    collaboratorRef = parsed.value;
  }

  const rehydrated = UserProfile.rehydrate({
    userRef: userRef.value,
    name: row.name,
    cpf: cpf.value,
    telephone: row.telephone,
    avatarUrl: row.avatarUrl,
    collaboratorRef,
  });
  if (!rehydrated.ok) return err('user-profile-mapper-invalid-state');
  return rehydrated;
};
