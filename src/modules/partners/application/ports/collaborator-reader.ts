/**
 * Port `CollaboratorReader` — leitura enriquecida do colaborador para a borda HTTP v1.
 *
 * O agregado `Collaborator` não carrega `legacyId`/`createdAt`/`updatedAt` (são da row
 * `par_collaborators`). A borda v1 espelha o schema legado `Collaborator`
 * (handbook/legacy_docs/openapi.yaml:2435), que inclui esses campos — daí um read-model
 * que compõe o agregado + metadados de persistência (read-only, ADR-0022/0032).
 *
 * Adapters: `collaborator-reader.drizzle.ts` (projeta a row via `collaboratorFromRow`) e
 * `collaborator-reader.in-memory.ts` (store semeável — teste/CLI).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { Collaborator } from '#src/modules/partners/domain/collaborator/types.ts';

export type CollaboratorReadRecord = Readonly<{
  collaborator: Collaborator;
  legacyId: number | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CollaboratorReaderError = 'collaborator-read-unavailable';

export type CollaboratorReader = Readonly<{
  getById: (
    id: CollaboratorId,
  ) => Promise<Result<CollaboratorReadRecord | null, CollaboratorReaderError>>;
  /** Lista todos os read-records (filtro/paginação ficam na borda, ADR-0032 transitório). */
  list: () => Promise<Result<readonly CollaboratorReadRecord[], CollaboratorReaderError>>;
}>;
