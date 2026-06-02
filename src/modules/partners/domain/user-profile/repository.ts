/**
 * Port `UserProfileRepository` — contrato de persistência do agregado `UserProfile`.
 *
 * Identidade = `userRef` (1:1 com auth.User). `cpf` único (legado `users.cpf`).
 * Sem outbox nesta fase. Adapters: InMemory (este ticket) + Drizzle `par_user_profiles` (follow-up).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { UserRef } from '#src/shared/kernel/user-ref.ts';
import type { Cpf } from '#src/shared/kernel/cpf.ts';
import type { UserProfile } from './types.ts';

export type UserProfileRepositoryError =
  | 'user-profile-repo-unavailable' // transient (timeout/conexão) no adapter real
  | 'user-profile-cpf-duplicate'; // cpf já usado por outro userRef

export type UserProfileRepository = Readonly<{
  findByUserRef: (
    userRef: UserRef,
  ) => Promise<Result<UserProfile | null, UserProfileRepositoryError>>;
  findByCpf: (cpf: Cpf) => Promise<Result<UserProfile | null, UserProfileRepositoryError>>;
  save: (profile: UserProfile) => Promise<Result<void, UserProfileRepositoryError>>;
}>;
