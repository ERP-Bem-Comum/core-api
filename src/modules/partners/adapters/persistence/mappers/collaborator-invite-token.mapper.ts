// Mapper CollaboratorInviteToken: row MySQL ↔ agregado (módulo partners, #43).
// Espelha o password-reset-token.mapper do auth (DUPLICADO — ADR-0006).
//
//   - inviteTokenFromRow(row): Result<CollaboratorInviteToken, CollaboratorInviteTokenMapperError>
//     Escalar (sem JOIN). Ids rehydrate na borda. usedAt Date|null (mode:'date'). Tagged errors.
//   - inviteTokenToInsert(token): NewInviteTokenRow
//     Sem Clock (o token carrega seus instantes).
//
// ADR-0020: dialeto MySQL único, sem JSON. ADR-0014: só par_*. Zero throw/class no domínio.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as CollaboratorInviteTokenId from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { CollaboratorInviteToken } from '#src/modules/partners/domain/collaborator/invite-token.ts';
import type {
  InviteTokenRow,
  NewInviteTokenRow,
} from '#src/modules/partners/adapters/persistence/schemas/mysql.ts';

export type InviteTokenMapperInvalidId = Readonly<{
  tag: 'InviteTokenMapperInvalidId';
  attemptedValue: string;
}>;

export type InviteTokenMapperInvalidCollaboratorId = Readonly<{
  tag: 'InviteTokenMapperInvalidCollaboratorId';
  attemptedValue: string;
}>;

export type CollaboratorInviteTokenMapperError =
  | InviteTokenMapperInvalidId
  | InviteTokenMapperInvalidCollaboratorId;

const invalidId = (attemptedValue: string): InviteTokenMapperInvalidId => ({
  tag: 'InviteTokenMapperInvalidId',
  attemptedValue,
});

const invalidCollaboratorId = (attemptedValue: string): InviteTokenMapperInvalidCollaboratorId => ({
  tag: 'InviteTokenMapperInvalidCollaboratorId',
  attemptedValue,
});

export const inviteTokenFromRow = (
  row: Readonly<InviteTokenRow>,
): Result<CollaboratorInviteToken, CollaboratorInviteTokenMapperError> => {
  const idR = CollaboratorInviteTokenId.rehydrate(row.id);
  if (!idR.ok) return err(invalidId(row.id));

  const collaboratorIdR = CollaboratorId.rehydrate(row.collaboratorId);
  if (!collaboratorIdR.ok) return err(invalidCollaboratorId(row.collaboratorId));

  const token: CollaboratorInviteToken = {
    id: idR.value,
    collaboratorId: collaboratorIdR.value,
    // tokenHash opaco — armazenado e retornado como-está (ASCII hex)
    tokenHash: row.tokenHash,
    requestedAt: row.requestedAt,
    expiresAt: row.expiresAt,
    // usedAt: nullable (null = pending; Date = consumido)
    usedAt: row.usedAt,
  };

  return ok(token);
};

export const inviteTokenToInsert = (token: CollaboratorInviteToken): NewInviteTokenRow => ({
  id: token.id as unknown as string,
  collaboratorId: token.collaboratorId as unknown as string,
  tokenHash: token.tokenHash,
  requestedAt: token.requestedAt,
  expiresAt: token.expiresAt,
  usedAt: token.usedAt,
});
