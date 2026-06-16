/**
 * Adapter InMemory do `CollaboratorHistoryRepository` (append) + `CollaboratorHistoryReader`
 * (listByCollaborator DESC) — teste/CLI. #44.
 *
 * Um único array append-only respaldando os dois ports (o reader lê o que o repo apendou),
 * o que permite aos testes de captura apendar via use-case e ler de volta. `clear()` para isolar.
 */

import { ok } from '#src/shared/primitives/result.ts';
import type { CollaboratorHistoryRepository } from '#src/modules/partners/domain/collaborator/collaborator-history-repository.ts';
import type { CollaboratorHistoryEntry } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type { CollaboratorHistoryReader } from '#src/modules/partners/application/ports/collaborator-history-reader.ts';

export type InMemoryCollaboratorHistoryStore = Readonly<{
  repository: CollaboratorHistoryRepository;
  reader: CollaboratorHistoryReader;
  /** Acesso direto às entries apendadas (asserções de teste). */
  entries: () => readonly CollaboratorHistoryEntry[];
  clear: () => void;
}>;

export const makeInMemoryCollaboratorHistoryStore = (
  seed: readonly CollaboratorHistoryEntry[] = [],
): InMemoryCollaboratorHistoryStore => {
  const log: CollaboratorHistoryEntry[] = [...seed];

  const repository: CollaboratorHistoryRepository = {
    append: async (entry) => {
      log.push(entry);
      return ok(undefined);
    },
  };

  const reader: CollaboratorHistoryReader = {
    listByCollaborator: async (id) =>
      ok(
        log
          .filter((e) => e.collaboratorRef === id)
          .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()),
      ),
  };

  return {
    repository,
    reader,
    entries: () => [...log],
    clear: () => {
      log.length = 0;
    },
  };
};
