import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '#src/shared/utils/id.ts';
import type { Brand } from '#src/shared/primitives/brand.ts';

// Padrão D: `import * as CollaboratorId from './collaborator-id.ts'`.
// Espelho rehydrate-only para outros módulos: `CollaboratorRef` em public-api/refs.ts.

export type CollaboratorId = Brand<string, 'CollaboratorId'>;
export type CollaboratorIdError = 'collaborator-id-invalid';

export const generate = (): CollaboratorId => newUuid() as CollaboratorId;

export const rehydrate = (raw: string): Result<CollaboratorId, CollaboratorIdError> =>
  isUuidV4(raw) ? ok(raw as CollaboratorId) : err('collaborator-id-invalid');
