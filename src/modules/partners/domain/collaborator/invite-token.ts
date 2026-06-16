/**
 * CollaboratorInviteToken — agregado do autocadastro público do colaborador (#43).
 *
 * Espelha o `PasswordResetToken` do auth (DUPLICADO, não importado — ADR-0006): token OPACO
 * de alta entropia gerado no adapter (minter); o `tokenHash` (sha256) persiste e o claro vai
 * ao e-mail. One-time + TTL: `consume` só tem sucesso no estado `pending` e marca `usedAt`
 * (segundo uso falha). Estado COMPUTADO por `state(token, now)` (precedência used > expired >
 * pending) — `expired` depende do relógio injetado. Imutável. `tokenHash` NUNCA em claro/log.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import type { CollaboratorId } from './collaborator-id.ts';
import type { CollaboratorInviteTokenId } from './invite-token-id.ts';

export type CollaboratorInviteToken = Readonly<{
  id: CollaboratorInviteTokenId;
  collaboratorId: CollaboratorId;
  tokenHash: string;
  requestedAt: Date;
  expiresAt: Date;
  usedAt: Date | null;
}>;

export type CollaboratorInviteTokenState = 'pending' | 'expired' | 'used';

export type CollaboratorInviteTokenError =
  | 'invite-token-hash-empty'
  | 'invite-token-expiry-before-request'
  | 'invite-token-expired'
  | 'invite-token-used';

export type IssueInput = Readonly<{
  id: CollaboratorInviteTokenId;
  collaboratorId: CollaboratorId;
  tokenHash: string;
  requestedAt: Date;
  expiresAt: Date;
}>;

export const issue = (
  input: IssueInput,
): Result<CollaboratorInviteToken, CollaboratorInviteTokenError> => {
  if (input.tokenHash.trim().length === 0) return err('invite-token-hash-empty');
  if (input.expiresAt.getTime() <= input.requestedAt.getTime())
    return err('invite-token-expiry-before-request');
  return ok(immutable({ ...input, usedAt: null }));
};

// Precedência: used > expired > pending.
export const state = (token: CollaboratorInviteToken, now: Date): CollaboratorInviteTokenState => {
  if (token.usedAt !== null) return 'used';
  if (now.getTime() >= token.expiresAt.getTime()) return 'expired';
  return 'pending';
};

/** One-time: só consome no estado `pending`, marcando `usedAt`. Idempotência NÃO se aplica. */
export const consume = (
  token: CollaboratorInviteToken,
  at: Date,
): Result<CollaboratorInviteToken, CollaboratorInviteTokenError> => {
  switch (state(token, at)) {
    case 'pending':
      return ok(immutable({ ...token, usedAt: at }));
    case 'expired':
      return err('invite-token-expired');
    case 'used':
      return err('invite-token-used');
  }
};
