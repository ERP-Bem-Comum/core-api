/**
 * Port de persistencia do agregado RefreshToken (modulo auth, sessao).
 *
 * Posicionado em domain/ (§3.H.2). 1 port (DD-PORTS-01). `findByTokenHash` e o lookup do fluxo
 * de refresh (use case hasheia o refresh em claro e busca). `findRevocableByUserId` (DD-SESSION-05)
 * serve a reuse detection: retorna os tokens com `revokedAt === null` (criterio armazenavel; `active`
 * e temporal e o repo nao tem Clock - DD-SESSION-01). ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { UserId } from '../identity/user-id.ts';
import type { RefreshTokenId } from './refresh-token-id.ts';
import type { RefreshToken } from './refresh-token.ts';

export type RefreshTokenRepositoryError = 'refresh-token-repo-unavailable';

export type RefreshTokenRepository = Readonly<{
  save: (token: RefreshToken) => Promise<Result<void, RefreshTokenRepositoryError>>;
  findById: (
    id: RefreshTokenId,
  ) => Promise<Result<RefreshToken | null, RefreshTokenRepositoryError>>;
  findByTokenHash: (
    tokenHash: string,
  ) => Promise<Result<RefreshToken | null, RefreshTokenRepositoryError>>;
  findRevocableByUserId: (
    userId: UserId,
  ) => Promise<Result<readonly RefreshToken[], RefreshTokenRepositoryError>>;
}>;
