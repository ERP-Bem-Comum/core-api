/**
 * authenticateUser - use case do modulo auth (A5, login). Imperative Shell (async, Result).
 *
 * Verifica credencial e emite o access JWT. DD-LOGIN-01: parse falho de email/senha -> invalid-credentials
 * (login nao valida politica de forca); ordem anti-enumeration (so revela user-disabled apos a senha correta).
 * Refresh token opaco fica em A5b. ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Email from '../../domain/identity/email.ts';
import * as Password from '../../domain/credential/password-policy.ts';
import * as User from '../../domain/identity/user/user.ts';
import type { UserId } from '../../domain/identity/user-id.ts';
import type { UserReader, UserRepositoryError } from '../../domain/identity/user/repository.ts';
import type { PasswordHasher, PasswordHasherError } from '../ports/password-hasher.ts';
import type { TokenIssuer, TokenIssuerError } from '../ports/token-issuer.ts';

export type AuthenticateUserCommand = Readonly<{ email: string; password: string }>;

export type AuthenticateUserError =
  | 'invalid-credentials'
  | 'user-disabled'
  | PasswordHasherError
  | TokenIssuerError
  | UserRepositoryError;

export type AuthenticateUserOutput = Readonly<{ accessToken: string; userId: UserId }>;

type Deps = Readonly<{
  userReader: UserReader;
  passwordHasher: PasswordHasher;
  tokenIssuer: TokenIssuer;
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

    return ok({ accessToken: accessToken.value, userId: active.value.id });
  };
