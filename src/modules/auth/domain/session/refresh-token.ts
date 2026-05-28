/**
 * RefreshToken - agregado de sessao do modulo auth (sessao hibrida, ADR-0024).
 *
 * Module-as-namespace (Padrao D). Decisoes: design-decisions.md DD-SESSION-01..03.
 * Estado COMPUTADO por `state(token, now)` (nao tipos refinados) porque `expired` depende do relogio.
 * `now`/`at: Date` injetados (Clock no use case). Imutavel (immutable + spread).
 * `tokenHash` opaco non-empty - NUNCA em claro, log ou serializacao. ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { UserId } from '../identity/user-id.ts';
import type { RefreshTokenId } from './refresh-token-id.ts';

export type RefreshToken = Readonly<{
  id: RefreshTokenId;
  userId: UserId;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBy: RefreshTokenId | null;
}>;

export type RefreshTokenState = 'active' | 'expired' | 'revoked' | 'rotated';

export type RefreshTokenError =
  | 'refresh-token-hash-empty'
  | 'refresh-token-expiry-before-issue'
  | 'refresh-token-revoked'
  | 'refresh-token-rotated'
  | 'refresh-token-expired';

export type IssueInput = Readonly<{
  id: RefreshTokenId;
  userId: UserId;
  tokenHash: string;
  issuedAt: Date;
  expiresAt: Date;
}>;

export const issue = (input: IssueInput): Result<RefreshToken, RefreshTokenError> => {
  if (input.tokenHash.trim().length === 0) return err('refresh-token-hash-empty');
  if (input.expiresAt.getTime() <= input.issuedAt.getTime())
    return err('refresh-token-expiry-before-issue');
  return ok(immutable({ ...input, revokedAt: null, replacedBy: null }));
};

// Precedencia (DD-SESSION-03): revoked > rotated > expired > active.
export const state = (token: RefreshToken, now: Date): RefreshTokenState => {
  if (token.revokedAt !== null) return 'revoked';
  if (token.replacedBy !== null) return 'rotated';
  if (now.getTime() >= token.expiresAt.getTime()) return 'expired';
  return 'active';
};

export const revoke = (token: RefreshToken, at: Date): RefreshToken =>
  token.revokedAt !== null ? token : immutable({ ...token, revokedAt: at });

export const rotate = (token: RefreshToken, replacement: RefreshTokenId, _at: Date): RefreshToken =>
  immutable({ ...token, replacedBy: replacement });

export const verify = (token: RefreshToken, now: Date): Result<void, RefreshTokenError> => {
  switch (state(token, now)) {
    case 'active':
      return ok(undefined);
    case 'revoked':
      return err('refresh-token-revoked');
    case 'rotated':
      return err('refresh-token-rotated');
    case 'expired':
      return err('refresh-token-expired');
  }
};
