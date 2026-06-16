/**
 * Port `CollaboratorInviteTokenRepository` — persistência do agregado CollaboratorInviteToken (#43).
 *
 * Espelha `PasswordResetTokenRepository` do auth (DUPLICADO — ADR-0006). `findByTokenHash` é o
 * lookup do GET/POST (use case hasheia o token em claro e busca). `findUnusedByCollaboratorId`
 * serve o request a invalidar tokens pendentes anteriores: critério ARMAZENÁVEL (`used_at IS NULL`);
 * `expired` é temporal e o repo não tem Clock.
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { CollaboratorId } from './collaborator-id.ts';
import type { CollaboratorInviteToken } from './invite-token.ts';

export type CollaboratorInviteTokenRepositoryError = 'collaborator-invite-token-repo-unavailable';

export type CollaboratorInviteTokenRepository = Readonly<{
  save: (
    token: CollaboratorInviteToken,
  ) => Promise<Result<void, CollaboratorInviteTokenRepositoryError>>;
  findByTokenHash: (
    tokenHash: string,
  ) => Promise<Result<CollaboratorInviteToken | null, CollaboratorInviteTokenRepositoryError>>;
  findUnusedByCollaboratorId: (
    collaboratorId: CollaboratorId,
  ) => Promise<Result<readonly CollaboratorInviteToken[], CollaboratorInviteTokenRepositoryError>>;
}>;
