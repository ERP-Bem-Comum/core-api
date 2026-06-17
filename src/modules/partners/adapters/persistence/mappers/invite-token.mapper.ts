/**
 * Mapper `CollaboratorInviteToken`: row MySQL ↔ agregado (US5). Espelha
 * `auth/.../mappers/password-reset-token.mapper.ts`.
 *
 *  - `inviteTokenFromRow(row)`: rehydrate dos ids na borda; `usedAt` Date|null (mode:'date').
 *    Tagged errors (Padrão D) — o repo converte para `invite-token-repo-unavailable`.
 *  - `inviteTokenToInsert(token)`: sem Clock (o token carrega seus instantes).
 *
 * ADR-0020 (MySQL único, sem JSON). ADR-0014 (par_* isolado). Zero throw/class.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as InviteTokenId from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { CollaboratorInviteToken } from '#src/modules/partners/domain/collaborator/invite-token.ts';
import type { InviteTokenRow, NewInviteTokenRow } from '../schemas/mysql.ts';

export type InviteTokenMapperError =
  | Readonly<{ tag: 'InviteTokenMapperInvalidId'; attemptedValue: string }>
  | Readonly<{ tag: 'InviteTokenMapperInvalidCollaboratorId'; attemptedValue: string }>;

export const inviteTokenFromRow = (
  row: Readonly<InviteTokenRow>,
): Result<CollaboratorInviteToken, InviteTokenMapperError> => {
  const idR = InviteTokenId.rehydrate(row.id);
  if (!idR.ok) return err({ tag: 'InviteTokenMapperInvalidId', attemptedValue: row.id });

  const collabR = CollaboratorId.rehydrate(row.collaboratorId);
  if (!collabR.ok)
    return err({
      tag: 'InviteTokenMapperInvalidCollaboratorId',
      attemptedValue: row.collaboratorId,
    });

  return ok({
    id: idR.value,
    collaboratorId: collabR.value,
    // tokenHash opaco — armazenado e retornado como-está (ASCII hex).
    tokenHash: row.tokenHash,
    issuedAt: row.issuedAt,
    expiresAt: row.expiresAt,
    // usedAt: null = pending; Date = consumido (uso-único).
    usedAt: row.usedAt,
  });
};

export const inviteTokenToInsert = (token: CollaboratorInviteToken): NewInviteTokenRow => ({
  id: token.id as unknown as string,
  collaboratorId: token.collaboratorId as unknown as string,
  tokenHash: token.tokenHash,
  issuedAt: token.issuedAt,
  expiresAt: token.expiresAt,
  usedAt: token.usedAt,
});
