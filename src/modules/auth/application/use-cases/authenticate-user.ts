/**
 * authenticateUser - use case do modulo auth (A5 + A5b, login). Imperative Shell (async, Result).
 *
 * Verifica credencial e emite o par da sessao hibrida: access JWT (TokenIssuer) + refresh opaco
 * (RefreshTokenMinter -> RefreshToken.issue -> persistido; o `token` claro vai ao cliente, o `tokenHash`
 * persiste). DD-LOGIN-01: parse falho de email/senha -> invalid-credentials (login nao valida politica);
 * ordem anti-enumeration (so revela user-disabled apos a senha correta). ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Email from '../../domain/identity/email.ts';
import * as Password from '../../domain/credential/password-policy.ts';
import * as User from '../../domain/identity/user/user.ts';
import * as RefreshToken from '../../domain/session/refresh-token.ts';
import * as RefreshTokenId from '../../domain/session/refresh-token-id.ts';
import type { UserId } from '../../domain/identity/user-id.ts';
import type { UserReader, UserRepositoryError } from '../../domain/identity/user/repository.ts';
import type {
  RefreshTokenRepository,
  RefreshTokenRepositoryError,
} from '../../domain/session/refresh-token-repository.ts';
import type { PasswordHasher, PasswordHasherError } from '../ports/password-hasher.ts';
import type { TokenIssuer, TokenIssuerError } from '../ports/token-issuer.ts';
import type { RefreshTokenMinter } from '../ports/refresh-token-minter.ts';

export type AuthenticateUserCommand = Readonly<{ email: string; password: string }>;

export type AuthenticateUserError =
  | 'invalid-credentials'
  | 'user-disabled'
  | 'session-issue-failed'
  | PasswordHasherError
  | TokenIssuerError
  | UserRepositoryError
  | RefreshTokenRepositoryError;

export type AuthenticateUserOutput = Readonly<{
  accessToken: string;
  refreshToken: string;
  userId: UserId;
}>;

type Deps = Readonly<{
  userReader: UserReader;
  passwordHasher: PasswordHasher;
  tokenIssuer: TokenIssuer;
  refreshTokenMinter: RefreshTokenMinter;
  refreshTokenRepo: RefreshTokenRepository;
  clock: Clock;
  refreshTtlSeconds: number;
}>;

export const authenticateUser =
  (deps: Deps) =>
  async (
    cmd: AuthenticateUserCommand,
  ): Promise<Result<AuthenticateUserOutput, AuthenticateUserError>> => {
    const email = Email.parse(cmd.email);
    if (!email.ok) return err('invalid-credentials');

    const password = Password.parse(cmd.password);
    if (!password.ok) return err('invalid-credentials');

    const found = await deps.userReader.findByEmail(email.value);
    if (!found.ok) return found;
    if (found.value === null) return err('invalid-credentials');

    const verified = await deps.passwordHasher.verify(password.value, found.value.passwordHash);
    if (!verified.ok) return verified;
    if (!verified.value) return err('invalid-credentials');

    const active = User.parseActive(found.value);
    if (!active.ok) return err('user-disabled');

    const accessToken = await deps.tokenIssuer.issueAccessToken({ userId: active.value.id });
    if (!accessToken.ok) return accessToken;

    const secret = deps.refreshTokenMinter.mint();
    const now = deps.clock.now();
    const refreshToken = RefreshToken.issue({
      id: RefreshTokenId.generate(),
      userId: active.value.id,
      tokenHash: secret.tokenHash,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + deps.refreshTtlSeconds * 1000),
    });
    if (!refreshToken.ok) return err('session-issue-failed');

    const saved = await deps.refreshTokenRepo.save(refreshToken.value);
    if (!saved.ok) return saved;

    return ok({
      accessToken: accessToken.value,
      refreshToken: secret.token,
      userId: active.value.id,
    });
  };
