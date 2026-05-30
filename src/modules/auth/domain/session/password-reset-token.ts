/**
 * PasswordResetToken - agregado do fluxo de recuperacao de senha (BE-REC-003, OWASP WSTG-ATHN).
 *
 * Module-as-namespace (Padrao D). Espelha RefreshToken: token OPACO de alta entropia gerado no
 * adapter (minter); o `tokenHash` (sha256) persiste e o claro vai ao e-mail. One-time + TTL curto:
 * `consume` so tem sucesso no estado `pending` e marca `usedAt` (segundo uso falha). Estado COMPUTADO
 * por `state(token, now)` (precedencia used > expired > pending) - `expired` depende do relogio.
 * `at: Date` injetado (Clock no use case). Imutavel. `tokenHash` NUNCA em claro/log. ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { UserId } from '../identity/user-id.ts';
import type { PasswordResetTokenId } from './password-reset-token-id.ts';

export type PasswordResetToken = Readonly<{
  id: PasswordResetTokenId;
  userId: UserId;
  tokenHash: string;
  requestedAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}>;

export type PasswordResetTokenState = 'pending' | 'expired' | 'used';

export type PasswordResetTokenError =
  | 'reset-token-hash-empty'
  | 'reset-token-expiry-before-request'
  | 'reset-token-expired'
  | 'reset-token-used';

export type IssueInput = Readonly<{
  id: PasswordResetTokenId;
  userId: UserId;
  tokenHash: string;
  requestedAt: Date;
  expiresAt: Date;
}>;

export const issue = (input: IssueInput): Result<PasswordResetToken, PasswordResetTokenError> => {
  if (input.tokenHash.trim().length === 0) return err('reset-token-hash-empty');
  if (input.expiresAt.getTime() <= input.requestedAt.getTime())
    return err('reset-token-expiry-before-request');
  return ok(immutable({ ...input, usedAt: null }));
};

// Precedencia: used > expired > pending.
export const state = (token: PasswordResetToken, now: Date): PasswordResetTokenState => {
  if (token.usedAt !== null) return 'used';
  if (now.getTime() >= token.expiresAt.getTime()) return 'expired';
  return 'pending';
};

/** One-time: so consome no estado `pending`, marcando `usedAt`. Idempotencia NAO se aplica. */
export const consume = (
  token: PasswordResetToken,
  at: Date,
): Result<PasswordResetToken, PasswordResetTokenError> => {
  switch (state(token, at)) {
    case 'pending':
      return ok(immutable({ ...token, usedAt: at }));
    case 'expired':
      return err('reset-token-expired');
    case 'used':
      return err('reset-token-used');
  }
};
