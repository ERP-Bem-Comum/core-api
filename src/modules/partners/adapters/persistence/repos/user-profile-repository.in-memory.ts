/**
 * Adapter InMemory do `UserProfileRepository` (módulo partners). Para teste/CLI.
 *
 * `Map<UserRef, UserProfile>` (userRef é a identidade 1:1). `save` recusa cpf
 * duplicado com userRef diferente (espelha o UNIQUE de `par_user_profiles.cpf`).
 */

import { ok, err } from '#src/shared/primitives/result.ts';
import type { UserRef } from '#src/shared/kernel/user-ref.ts';
import type { UserProfileRepository } from '#src/modules/partners/domain/user-profile/repository.ts';
import type { UserProfile } from '#src/modules/partners/domain/user-profile/types.ts';

export type InMemoryUserProfileStore = Readonly<{
  repository: UserProfileRepository;
  clear: () => void;
}>;

export const makeInMemoryUserProfileStore = (): InMemoryUserProfileStore => {
  const map = new Map<UserRef, UserProfile>();

  const repository: UserProfileRepository = {
    findByUserRef: async (userRef) => ok(map.get(userRef) ?? null),
    findByCpf: async (cpf) => ok([...map.values()].find((p) => p.cpf === cpf) ?? null),
    save: async (profile) => {
      for (const existing of map.values()) {
        if (existing.cpf === profile.cpf && existing.userRef !== profile.userRef) {
          return err('user-profile-cpf-duplicate');
        }
      }
      map.set(profile.userRef, profile);
      return ok(undefined);
    },
  };

  return {
    repository,
    clear: () => {
      map.clear();
    },
  };
};
