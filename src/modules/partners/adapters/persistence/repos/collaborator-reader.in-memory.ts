/**
 * Adapter InMemory do `CollaboratorReader` (módulo partners) — teste/CLI.
 *
 * Store semeável de read-records (`Map<CollaboratorId, CollaboratorReadRecord>`). Espelha
 * o adapter Drizzle: `getById` por id, ausente → ok(null).
 */

import { ok } from '#src/shared/primitives/result.ts';
import type {
  CollaboratorReader,
  CollaboratorReadRecord,
} from '#src/modules/partners/application/ports/collaborator-reader.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

export const makeInMemoryCollaboratorReader = (
  seed: readonly CollaboratorReadRecord[] = [],
): CollaboratorReader => {
  const map = new Map<CollaboratorId, CollaboratorReadRecord>();
  for (const record of seed) map.set(record.collaborator.id, record);

  return {
    getById: async (id) => ok(map.get(id) ?? null),
    list: async () => ok([...map.values()]),
  };
};
