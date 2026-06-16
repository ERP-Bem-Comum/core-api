/**
 * Port `CollaboratorHistoryRepository` — escrita append-only do histórico de alterações (#44).
 *
 * Posicionado em `domain/collaborator/` ao lado de `repository.ts`: o histórico é parte da
 * consistência do agregado (toda transição registra uma entry). Append-only: sem update/delete.
 *
 * Reusa o slug transiente `collaborator-repo-unavailable` do `CollaboratorRepository` para que a
 * borda mapeie a indisponibilidade do histórico ao mesmo 503 (DoD/CA3) sem novo error-code no plugin.
 *
 * Adapters: `collaborator-history-repository.in-memory.ts` (teste) e `*.drizzle.ts` (MySQL — INSERT).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { CollaboratorRepositoryError } from './repository.ts';
import type { CollaboratorHistoryEntry } from './collaborator-history.ts';

export type CollaboratorHistoryRepository = Readonly<{
  append: (entry: CollaboratorHistoryEntry) => Promise<Result<void, CollaboratorRepositoryError>>;
}>;
