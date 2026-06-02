/**
 * Query `findUserProfileByCpf` — busca single por CPF. Valida o CPF na borda
 * (`Cpf.parse`); `null` é o "não encontrado" canônico (não-erro).
 */

import type { Result } from '#src/shared/index.ts';
import * as Cpf from '#src/shared/kernel/cpf.ts';
import type { CpfError } from '#src/shared/kernel/cpf.ts';
import type { UserProfile } from '#src/modules/partners/domain/user-profile/types.ts';
import type {
  UserProfileRepository,
  UserProfileRepositoryError,
} from '#src/modules/partners/domain/user-profile/repository.ts';

export type FindUserProfileByCpfCommand = Readonly<{ cpf: string }>;

export type FindUserProfileByCpfError = CpfError | UserProfileRepositoryError;

type Deps = Readonly<{ userProfileRepo: UserProfileRepository }>;

export const findUserProfileByCpf =
  (deps: Deps) =>
  async (
    cmd: FindUserProfileByCpfCommand,
  ): Promise<Result<UserProfile | null, FindUserProfileByCpfError>> => {
    const cpf = Cpf.parse(cmd.cpf);
    if (!cpf.ok) return cpf;
    return deps.userProfileRepo.findByCpf(cpf.value);
  };
