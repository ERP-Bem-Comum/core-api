/**
 * Port de persistencia do agregado PasswordResetToken (modulo auth, BE-REC-003).
 *
 * Posicionado em domain/ (§3.H.2). `findByTokenHash` e o lookup do confirm (use case hasheia o
 * token em claro e busca). `findUnusedByUserId` serve o request a invalidar tokens pendentes
 * anteriores: criterio ARMAZENAVEL (`used_at IS NULL`); `expired` e temporal e o repo nao tem Clock
 * (espelha `findRevocableByUserId` do refresh). ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { UserId } from '../identity/user-id.ts';
import type { PasswordResetToken } from './password-reset-token.ts';

export type PasswordResetTokenRepositoryError = 'password-reset-token-repo-unavailable';

export type PasswordResetTokenRepository = Readonly<{
  save: (token: PasswordResetToken) => Promise<Result<void, PasswordResetTokenRepositoryError>>;
  findByTokenHash: (
    tokenHash: string,
  ) => Promise<Result<PasswordResetToken | null, PasswordResetTokenRepositoryError>>;
  findUnusedByUserId: (
    userId: UserId,
  ) => Promise<Result<readonly PasswordResetToken[], PasswordResetTokenRepositoryError>>;
}>;
