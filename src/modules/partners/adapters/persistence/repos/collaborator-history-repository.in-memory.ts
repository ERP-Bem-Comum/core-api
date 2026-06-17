// Adapter InMemory do CollaboratorHistoryRepository (US4) — store único (append + list no mesmo
// array). Teste/boot sem DB. `record` materializa o diff via buildHistoryEntries.

import { type Result, ok } from '#src/shared/primitives/result.ts';
import { buildHistoryEntries } from '../mappers/collaborator-history.mapper.ts';
import type {
  CollaboratorHistoryEntry,
  CollaboratorHistoryError,
  CollaboratorHistoryRepository,
  RecordHistoryInput,
} from '#src/modules/partners/application/ports/collaborator-history.ts';

export const makeInMemoryCollaboratorHistory = (
  seed: readonly CollaboratorHistoryEntry[] = [],
): CollaboratorHistoryRepository => {
  const entries: CollaboratorHistoryEntry[] = [...seed];
  return {
    record: async (input: RecordHistoryInput): Promise<Result<void, CollaboratorHistoryError>> => {
      entries.push(...buildHistoryEntries(input));
      return ok(undefined);
    },
    listByCollaborator: async (
      collaboratorId: string,
    ): Promise<Result<readonly CollaboratorHistoryEntry[], CollaboratorHistoryError>> =>
      ok(
        entries
          .filter((e) => e.collaboratorId === collaboratorId)
          .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime()),
      ),
  };
};
