/**
 * refreshAccessToken - use case do modulo auth (A6b, refresh/rotacao). Imperative Shell (async, Result).
 *
 * Recebe o refresh em claro, hasheia (RefreshTokenMinter.hash) e busca; verifica o estado; rotaciona e
 * emite um novo par (access JWT + novo refresh opaco). Espelha o wiring de authenticateUser.
 *
 * Seguranca:
 *  - DD-SESSION-05 (reuse detection): refresh ja `rotated` reapresentado e sinal de replay/roubo ->
 *    revoga TODA a cadeia revogavel do usuario antes de falhar.
 *  - DD-SESSION-04 (defense-in-depth): so renova para User ativo; conta desabilitada/ausente -> revoga o
 *    refresh apresentado e nega (o EventBus de revogacao ainda nao existe).
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as User from '../../domain/identity/user/user.ts';
import * as RefreshToken from '../../domain/session/refresh-token.ts';
import * as RefreshTokenId from '../../domain/session/refresh-token-id.ts';
import type { UserId } from '../../domain/identity/user-id.ts';
import type { UserReader, UserRepositoryError } from '../../domain/identity/user/repository.ts';
import type {
  RefreshTokenRepository,
  RefreshTokenRepositoryError,
} from '../../domain/session/refresh-token-repository.ts';
import type { TokenIssuer, TokenIssuerError } from '../ports/token-issuer.ts';
import type { RefreshTokenMinter } from '../ports/refresh-token-minter.ts';

export type RefreshAccessTokenCommand = Readonly<{ refreshToken: string }>;

export type RefreshAccessTokenError =
  | 'refresh-token-not-found'
  | 'refresh-token-revoked'
  | 'refresh-token-rotated'
  | 'refresh-token-expired'
  | 'user-disabled'
  | 'session-issue-failed'
  | TokenIssuerError
  | UserRepositoryError
  | RefreshTokenRepositoryError;

export type RefreshAccessTokenOutput = Readonly<{
  accessToken: string;
  refreshToken: string;
  userId: UserId;
}>;

type Deps = Readonly<{
  userReader: UserReader;
  tokenIssuer: TokenIssuer;
  refreshTokenMinter: RefreshTokenMinter;
  refreshTokenRepo: RefreshTokenRepository;
  clock: Clock;
  refreshTtlSeconds: number;
}>;

const revokeChain = async (
  deps: Deps,
  userId: UserId,
  at: Date,
): Promise<Result<void, RefreshTokenRepositoryError>> => {
  const revocable = await deps.refreshTokenRepo.findRevocableByUserId(userId);
  if (!revocable.ok) return revocable;
  for (const token of revocable.value) {
    const saved = await deps.refreshTokenRepo.save(RefreshToken.revoke(token, at));
    if (!saved.ok) return saved;
  }
  return ok(undefined);
};

// Conta ausente/desabilitada (DD-SESSION-04): revoga o refresh apresentado e nega.
const denyDisabled = async (
  deps: Deps,
  token: RefreshToken.RefreshToken,
  at: Date,
): Promise<Result<never, 'user-disabled' | RefreshTokenRepositoryError>> => {
  const revoked = await deps.refreshTokenRepo.save(RefreshToken.revoke(token, at));
  if (!revoked.ok) return revoked;
  return err('user-disabled');
};

export const refreshAccessToken =
  (deps: Deps) =>
  async (
    cmd: RefreshAccessTokenCommand,
  ): Promise<Result<RefreshAccessTokenOutput, RefreshAccessTokenError>> => {
    const tokenHash = deps.refreshTokenMinter.hash(cmd.refreshToken);

    const found = await deps.refreshTokenRepo.findByTokenHash(tokenHash);
    if (!found.ok) return found;
    if (found.value === null) return err('refresh-token-not-found');
    const current = found.value;

    const now = deps.clock.now();
    const verified = RefreshToken.verify(current, now);
    if (!verified.ok) {
      switch (verified.error) {
        case 'refresh-token-rotated': {
          const revoked = await revokeChain(deps, current.userId, now);
          if (!revoked.ok) return revoked;
          return err('refresh-token-rotated');
        }
        case 'refresh-token-revoked':
          return err('refresh-token-revoked');
        case 'refresh-token-expired':
          return err('refresh-token-expired');
        // state() so produz revoked/rotated/expired; estes vem apenas de issue (fail-closed).
        case 'refresh-token-hash-empty':
        case 'refresh-token-expiry-before-issue':
          return err('session-issue-failed');
      }
    }

    const user = await deps.userReader.findById(current.userId);
    if (!user.ok) return user;
    if (user.value === null) return denyDisabled(deps, current, now);
    const active = User.parseActive(user.value);
    if (!active.ok) return denyDisabled(deps, current, now);

    // Emite o access ANTES de mutar a persistencia: falha do tokenIssuer nao consome o refresh
    // apresentado (que, se rotacionado e reapresentado no retry, dispararia reuse detection). Espelha
    // authenticate-user.
    const accessToken = await deps.tokenIssuer.issueAccessToken({ userId: active.value.id });
    if (!accessToken.ok) return accessToken;

    const newId = RefreshTokenId.generate();
    const rotatedOld = await deps.refreshTokenRepo.save(RefreshToken.rotate(current, newId, now));
    if (!rotatedOld.ok) return rotatedOld;

    const secret = deps.refreshTokenMinter.mint();
    const newRefresh = RefreshToken.issue({
      id: newId,
      userId: active.value.id,
      tokenHash: secret.tokenHash,
      issuedAt: now,
      expiresAt: new Date(now.getTime() + deps.refreshTtlSeconds * 1000),
    });
    if (!newRefresh.ok) return err('session-issue-failed');

    const savedNew = await deps.refreshTokenRepo.save(newRefresh.value);
    if (!savedNew.ok) return savedNew;

    return ok({
      accessToken: accessToken.value,
      refreshToken: secret.token,
      userId: active.value.id,
    });
  };
