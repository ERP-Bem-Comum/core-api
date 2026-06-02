/**
 * confirmPasswordReset - fim da cadeia de recuperacao (BE-REC-003). Imperative Shell.
 *
 * token (claro) -> minter.hash -> findByTokenHash. Valida a nova senha (policy) ANTES de consumir
 * (nao "queima" o token por senha fraca). `consume` aplica one-time + TTL (DD). Troca a senha
 * (User.changePassword) e REVOGA TODAS as sessoes do usuario (OWASP ASVS V3.3 - reset deve derrubar
 * sessoes ativas). Ordem canonica: validar -> consume -> domain -> persist. ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Password from '../../domain/credential/password-policy.ts';
import * as User from '../../domain/identity/user/user.ts';
import * as ResetToken from '../../domain/session/password-reset-token.ts';
import * as RefreshToken from '../../domain/session/refresh-token.ts';
import type { UserId } from '../../domain/identity/user-id.ts';
import type {
  UserReader,
  UserRepository,
  UserRepositoryError,
} from '../../domain/identity/user/repository.ts';
import type {
  PasswordResetTokenRepository,
  PasswordResetTokenRepositoryError,
} from '../../domain/session/password-reset-token-repository.ts';
import type {
  RefreshTokenRepository,
  RefreshTokenRepositoryError,
} from '../../domain/session/refresh-token-repository.ts';
import type { PasswordHasher, PasswordHasherError } from '../ports/password-hasher.ts';
import type { PasswordResetTokenMinter } from '../ports/password-reset-token-minter.ts';

export type ConfirmPasswordResetCommand = Readonly<{ token: string; newPassword: string }>;

export type ConfirmPasswordResetError =
  | 'reset-token-invalid'
  | 'user-disabled'
  | ResetToken.PasswordResetTokenError
  | Password.PasswordPolicyError
  | PasswordHasherError
  | UserRepositoryError
  | PasswordResetTokenRepositoryError
  | RefreshTokenRepositoryError;

type Deps = Readonly<{
  resetTokenRepo: PasswordResetTokenRepository;
  minter: PasswordResetTokenMinter;
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

export const confirmPasswordReset =
  (deps: Deps) =>
  async (cmd: ConfirmPasswordResetCommand): Promise<Result<void, ConfirmPasswordResetError>> => {
    const found = await deps.resetTokenRepo.findByTokenHash(deps.minter.hash(cmd.token));
    if (!found.ok) return found;
    if (found.value === null) return err('reset-token-invalid');

    // Valida a nova senha ANTES de consumir o token (senha fraca nao queima o token one-time).
    const newPassword = Password.parse(cmd.newPassword);
    if (!newPassword.ok) return newPassword;

    const now = deps.clock.now();
    const consumed = ResetToken.consume(found.value, now);
    if (!consumed.ok) return consumed;

    const userR = await deps.userReader.findById(found.value.userId);
    if (!userR.ok) return userR;
    if (userR.value === null) return err('reset-token-invalid');

    const active = User.parseActive(userR.value);
    if (!active.ok) return err('user-disabled');

    // DD-USER-OIDC: usuario federado (passwordHash null) nao tem credencial local. Um reset nao
    // pode criar uma senha local para conta OIDC. Responde generico (reset-token-invalid,
    // anti-enumeration) sem revelar que a conta e federada.
    if (active.value.passwordHash === null) return err('reset-token-invalid');

    const newHash = await deps.passwordHasher.hash(newPassword.value);
    if (!newHash.ok) return newHash;

    const { user } = User.changePassword(active.value, newHash.value, now);
    const savedUser = await deps.userRepo.save(user);
    if (!savedUser.ok) return savedUser;

    // Marca o token como usado (one-time) apos a troca bem-sucedida.
    const savedToken = await deps.resetTokenRepo.save(consumed.value);
    if (!savedToken.ok) return savedToken;

    // Defense-in-depth (OWASP ASVS V3.3): reset derruba todas as sessoes ativas.
    return revokeAllForUser(deps.refreshTokenRepo, found.value.userId, now);
  };
