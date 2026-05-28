/**
 * changePassword - use case do modulo auth (A8). Imperative Shell (async, Result).
 *
 * Re-autentica (verifica a senha atual) -> aplica a nova (politica) -> User.changePassword -> save ->
 * revoga TODAS as sessoes do usuario (DD-USER-06, OWASP ASVS V3.3 — defense-in-depth enquanto o EventBus
 * nao existe). Retorna { user, event }; nao publica (transporte futuro). Senha em claro nunca persiste
 * (DD-USER-04). DD-LOGIN-01: senha atual mal-formada/invalida -> invalid-credentials (anti-enumeration).
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Password from '../../domain/credential/password-policy.ts';
import * as User from '../../domain/identity/user/user.ts';
import * as RefreshToken from '../../domain/session/refresh-token.ts';
import type { UserId } from '../../domain/identity/user-id.ts';
import type { ActiveUser } from '../../domain/identity/user/types.ts';
import type { PasswordChanged } from '../../domain/identity/user/events.ts';
import type {
  UserReader,
  UserRepository,
  UserRepositoryError,
} from '../../domain/identity/user/repository.ts';
import type {
  RefreshTokenRepository,
  RefreshTokenRepositoryError,
} from '../../domain/session/refresh-token-repository.ts';
import type { PasswordHasher, PasswordHasherError } from '../ports/password-hasher.ts';

export type ChangePasswordCommand = Readonly<{
  userId: UserId;
  currentPassword: string;
  newPassword: string;
}>;

export type ChangePasswordError =
  | 'invalid-credentials'
  | 'user-disabled'
  | Password.PasswordPolicyError
  | PasswordHasherError
  | UserRepositoryError
  | RefreshTokenRepositoryError;

export type ChangePasswordOutput = Readonly<{ user: ActiveUser; event: PasswordChanged }>;

type Deps = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  passwordHasher: PasswordHasher;
  refreshTokenRepo: RefreshTokenRepository;
  clock: Clock;
}>;

const revokeAllForUser = async (
  repo: RefreshTokenRepository,
  userId: UserId,
  at: Date,
): Promise<Result<void, RefreshTokenRepositoryError>> => {
  const revocable = await repo.findRevocableByUserId(userId);
  if (!revocable.ok) return revocable;
  for (const token of revocable.value) {
    const saved = await repo.save(RefreshToken.revoke(token, at));
    if (!saved.ok) return saved;
  }
  return ok(undefined);
};

export const changePassword =
  (deps: Deps) =>
  async (
    cmd: ChangePasswordCommand,
  ): Promise<Result<ChangePasswordOutput, ChangePasswordError>> => {
    const found = await deps.userReader.findById(cmd.userId);
    if (!found.ok) return found;
    if (found.value === null) return err('invalid-credentials');

    const active = User.parseActive(found.value);
    if (!active.ok) return err('user-disabled');

    const current = Password.parse(cmd.currentPassword);
    if (!current.ok) return err('invalid-credentials');
    const verified = await deps.passwordHasher.verify(current.value, active.value.passwordHash);
    if (!verified.ok) return verified;
    if (!verified.value) return err('invalid-credentials');

    const next = Password.parse(cmd.newPassword);
    if (!next.ok) return next;
    const newHash = await deps.passwordHasher.hash(next.value);
    if (!newHash.ok) return newHash;

    const now = deps.clock.now();
    const { user, event } = User.changePassword(active.value, newHash.value, now);
    const saved = await deps.userRepo.save(user);
    if (!saved.ok) return saved;

    const revoked = await revokeAllForUser(deps.refreshTokenRepo, cmd.userId, now);
    if (!revoked.ok) return revoked;

    return ok({ user, event });
  };
