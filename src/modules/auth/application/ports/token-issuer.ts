/**
 * Port TokenIssuer (modulo auth) - capacidade tecnica em application/ports/.
 *
 * Emite/verifica o access token JWT (DD-TOKEN-01: ES256 no adapter real). Claims: sub=userId.
 * O core-api emite; o BFF valida com a chave publica (ADR-0005/0024). ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { UserId } from '../../domain/identity/user-id.ts';

export type TokenIssuerError = 'token-issue-failed' | 'token-invalid' | 'token-expired';

export type AccessTokenClaims = Readonly<{ userId: UserId }>;

export type TokenIssuer = Readonly<{
  issueAccessToken: (
    input: Readonly<{ userId: UserId }>,
  ) => Promise<Result<string, TokenIssuerError>>;
  verifyAccessToken: (token: string) => Promise<Result<AccessTokenClaims, TokenIssuerError>>;
}>;
