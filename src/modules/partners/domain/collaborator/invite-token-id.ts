/**
 * CollaboratorInviteTokenId — branded id + generate/rehydrate (US5). Espelha
 * `password-reset-token-id.ts` do auth (UUID v4). ASCII puro.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

export type CollaboratorInviteTokenId = Brand<string, 'CollaboratorInviteTokenId'>;
export type CollaboratorInviteTokenIdError = 'collaborator-invite-token-id-invalid';

export const generate = (): CollaboratorInviteTokenId => newUuid() as CollaboratorInviteTokenId;

export const rehydrate = (
  raw: string,
): Result<CollaboratorInviteTokenId, CollaboratorInviteTokenIdError> =>
  isUuidV4(raw)
    ? ok(raw as CollaboratorInviteTokenId)
    : err('collaborator-invite-token-id-invalid');
