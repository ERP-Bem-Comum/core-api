import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Branded `CollaboratorHistoryId` (UUID v4) — espelha `collaborator-id.ts`.
// Consumir via `import * as CollaboratorHistoryId from './collaborator-history-id.ts'`.

export type CollaboratorHistoryId = Brand<string, 'CollaboratorHistoryId'>;
export type CollaboratorHistoryIdError = 'collaborator-history-id-invalid';

export const generate = (): CollaboratorHistoryId => newUuid() as CollaboratorHistoryId;

export const rehydrate = (
  raw: string,
): Result<CollaboratorHistoryId, CollaboratorHistoryIdError> =>
  isUuidV4(raw) ? ok(raw as CollaboratorHistoryId) : err('collaborator-history-id-invalid');
