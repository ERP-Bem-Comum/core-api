/**
 * authenticateUser - use case do modulo auth (A5 + A5b, login). Imperative Shell (async, Result).
 *
 * Verifica credencial e emite o par da sessao hibrida: access JWT (TokenIssuer) + refresh opaco
 * (RefreshTokenMinter -> RefreshToken.issue -> persistido; o `token` claro vai ao cliente, o `tokenHash`
 * persiste). DD-LOGIN-01: parse falho de email/senha -> invalid-credentials (login nao valida politica);
 * ordem anti-enumeration (so revela user-disabled apos a senha correta).
 *
 * BE-REC-002 (anti-timing, OWASP WSTG-ATHN): quando o usuario NAO existe, roda um verify "dummy"
 * (contra um PasswordHash descartavel injetado) para que o tempo de resposta seja equivalente ao do
 * ramo "usuario existe, senha errada" - sem isso, o relogio vaza quais e-mails sao contas reais.
 *
 * BE-REC-001 (account lockout, OWASP WSTG-ATHN-03): cooldown progressivo por conta (DD-USER-06).
 * Em cooldown a resposta e GENERICA (invalid-credentials) - nao vaza existencia nem o bloqueio -, e
 * roda o verify dummy p/ manter o timing. Falha de senha incrementa; sucesso reseta o contador.
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Email from '../../domain/identity/email.ts';
import * as Password from '../../domain/credential/password-policy.ts';
import * as User from '../../domain/identity/user/user.ts';
import * as RefreshToken from '../../domain/session/refresh-token.ts';
import * as RefreshTokenId from '../../domain/session/refresh-token-id.ts';
import * as AccountLockout from '../../domain/session/account-lockout.ts';
import type { LockoutPolicy } from '../../domain/session/account-lockout.ts';
import type { UserId } from '../../domain/identity/user-id.ts';
import type { PasswordHash } from '../../domain/credential/password-hash.ts';
import type { UserReader, UserRepositoryError } from '../../domain/identity/user/repository.ts';
import type {
  RefreshTokenRepository,
  RefreshTokenRepositoryError,
} from '../../domain/session/refresh-token-repository.ts';
import type { PasswordHasher, PasswordHasherError } from '../ports/password-hasher.ts';
import type { TokenIssuer, TokenIssuerError } from '../ports/token-issuer.ts';
import type { RefreshTokenMinter } from '../ports/refresh-token-minter.ts';
import type { LoginLockoutStore, LoginLockoutStoreError } from '../ports/login-lockout-store.ts';

export type AuthenticateUserCommand = Readonly<{ email: string; password: string }>;

export type AuthenticateUserError =
  | 'invalid-credentials'
  | 'user-disabled'
  | 'session-issue-failed'
  | PasswordHasherError
  | TokenIssuerError
  | UserRepositoryError
  | RefreshTokenRepositoryError
  | LoginLockoutStoreError;

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
  /**
   * Hash descartavel para o verify "dummy" no ramo usuario-inexistente (BE-REC-002). Equaliza o
   * tempo de resposta com o ramo senha-errada. Nunca corresponde a uma credencial real.
   */
  dummyPasswordHash: PasswordHash;
  /** Persistencia do cooldown por conta (BE-REC-001). */
  lockoutStore: LoginLockoutStore;
  /** Politica do cooldown (threshold + steps de minutos). */
  lockoutPolicy: LockoutPolicy;
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

    const now = deps.clock.now();

    const found = await deps.userReader.findByEmail(email.value);
    if (!found.ok) return found;
    if (found.value === null) {
      // Anti-timing (BE-REC-002): paga o custo do verify mesmo sem usuario, descartando o resultado,
      // para que este ramo demore o mesmo que "usuario existe, senha errada".
      await deps.passwordHasher.verify(password.value, deps.dummyPasswordHash);
      return err('invalid-credentials');
    }

    // BE-REC-001: estado de cooldown da conta. Em cooldown -> resposta GENERICA (nao vaza
    // existencia/bloqueio) + verify dummy p/ manter o timing equivalente ao ramo senha-errada.
    const lockoutR = await deps.lockoutStore.findByUserId(found.value.id);
    if (!lockoutR.ok) return lockoutR;
    const lockout = lockoutR.value ?? AccountLockout.initial(found.value.id);
    if (AccountLockout.isLocked(lockout, now)) {
      await deps.passwordHasher.verify(password.value, deps.dummyPasswordHash);
      return err('invalid-credentials');
    }

    // DD-USER-OIDC (anti-timing): usuario federado nao tem credencial local (passwordHash null).
    // Nunca autentica por senha. Para nao vazar quais contas sao federadas (timing side-channel,
    // OWASP WSTG-ATHN — mesma familia do BE-REC-002), paga o verify "dummy" antes de responder
    // o erro generico, espelhando o ramo "usuario inexistente" (acima).
    if (found.value.passwordHash === null) {
      await deps.passwordHasher.verify(password.value, deps.dummyPasswordHash);
      return err('invalid-credentials');
    }

    const verified = await deps.passwordHasher.verify(password.value, found.value.passwordHash);
    if (!verified.ok) return verified;
    if (!verified.value) {
      const failed = AccountLockout.registerFailure(lockout, now, deps.lockoutPolicy);
      const savedLockout = await deps.lockoutStore.save(failed);
      if (!savedLockout.ok) return savedLockout;
      return err('invalid-credentials');
    }

    // Senha correta: zera o contador (so grava se havia falhas pendentes).
    if (lockout.failedAttempts > 0) {
      const resetSaved = await deps.lockoutStore.save(AccountLockout.reset(lockout));
      if (!resetSaved.ok) return resetSaved;
    }

    const active = User.parseActive(found.value);
    if (!active.ok) return err('user-disabled');

    const accessToken = await deps.tokenIssuer.issueAccessToken({ userId: active.value.id });
    if (!accessToken.ok) return accessToken;

    const secret = deps.refreshTokenMinter.mint();
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
