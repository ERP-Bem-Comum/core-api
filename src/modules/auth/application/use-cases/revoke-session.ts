/**
 * revokeSession + revokeAllSessions - use cases de logout do modulo auth (A7). Imperative Shell.
 *
 * Logout "revoga imediatamente" (ADR-0024). DD-SESSION-06:
 *  - revokeSession: revoga o refresh apresentado (logout deste dispositivo).
 *  - revokeAllSessions: revoga toda a cadeia revogavel do usuario (sair de todos os dispositivos).
 * Idempotente: refresh nao encontrado -> ok (objetivo de logout ja cumprido; nao vaza existencia).
 * `revoke` de ja-revogado e no-op (agregado, DD-SESSION-03). Evento SessionRevoked: diferido (EventBus). ASCII puro.
 */

import { type Result, ok } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as RefreshToken from '../../domain/session/refresh-token.ts';
import type { UserId } from '../../domain/identity/user-id.ts';
import type {
  RefreshTokenRepository,
  RefreshTokenRepositoryError,
} from '../../domain/session/refresh-token-repository.ts';
import type { RefreshTokenMinter } from '../ports/refresh-token-minter.ts';

export type RevokeSessionCommand = Readonly<{ refreshToken: string }>;

export type RevokeSessionError = RefreshTokenRepositoryError;

type Deps = Readonly<{
  refreshTokenMinter: RefreshTokenMinter;
  refreshTokenRepo: RefreshTokenRepository;
  clock: Clock;
}>;

export const revokeSession =
  (deps: Deps) =>
  async (cmd: RevokeSessionCommand): Promise<Result<void, RevokeSessionError>> => {
    const found = await deps.refreshTokenRepo.findByTokenHash(
      deps.refreshTokenMinter.hash(cmd.refreshToken),
    );
    if (!found.ok) return found;
    if (found.value === null) return ok(undefined);
    return deps.refreshTokenRepo.save(RefreshToken.revoke(found.value, deps.clock.now()));
  };

export const revokeAllSessions =
  (deps: Deps) =>
  async (cmd: RevokeSessionCommand): Promise<Result<void, RevokeSessionError>> => {
    const found = await deps.refreshTokenRepo.findByTokenHash(
      deps.refreshTokenMinter.hash(cmd.refreshToken),
    );
    if (!found.ok) return found;
    if (found.value === null) return ok(undefined);

    const now = deps.clock.now();
    const revocable = await deps.refreshTokenRepo.findRevocableByUserId(found.value.userId);
    if (!revocable.ok) return revocable;
    for (const token of revocable.value) {
      const saved = await deps.refreshTokenRepo.save(RefreshToken.revoke(token, now));
      if (!saved.ok) return saved;
    }
    return ok(undefined);
  };

// BE-REC-004: variante por userId, para a rota HTTP autenticada (o access JWT da o userId, nao o
// refresh em claro). Revoga toda a cadeia revogavel do usuario (sair de todos os dispositivos).
type RevokeAllForUserDeps = Readonly<{
  refreshTokenRepo: RefreshTokenRepository;
  clock: Clock;
}>;

export type RevokeAllSessionsForUserCommand = Readonly<{ userId: UserId }>;

export const revokeAllSessionsForUser =
  (deps: RevokeAllForUserDeps) =>
  async (cmd: RevokeAllSessionsForUserCommand): Promise<Result<void, RevokeSessionError>> => {
    const revocable = await deps.refreshTokenRepo.findRevocableByUserId(cmd.userId);
    if (!revocable.ok) return revocable;
    const now = deps.clock.now();
    for (const token of revocable.value) {
      const saved = await deps.refreshTokenRepo.save(RefreshToken.revoke(token, now));
      if (!saved.ok) return saved;
    }
    return ok(undefined);
  };
