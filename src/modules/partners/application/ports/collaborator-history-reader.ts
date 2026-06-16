/**
 * Port `CollaboratorHistoryReader` — leitura do histórico de alterações do colaborador (#44).
 *
 * Read-side separado do repository de escrita (CQRS leve, espelha `CollaboratorReader`). Lista as
 * entries de um colaborador ordenadas por `occurredAt` DESC (consulta da rota GET /:id/history e
 * do export CSV `?type=history`).
 *
 * Adapters: `collaborator-history-reader.in-memory.ts` (semeável — teste/CLI) e `*.drizzle.ts`
 * (SELECT WHERE collaborator_ref = ? ORDER BY occurred_at DESC).
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { CollaboratorHistoryEntry } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';

export type CollaboratorHistoryReaderError = 'collaborator-repo-unavailable';

export type CollaboratorHistoryReader = Readonly<{
  listByCollaborator: (
    id: CollaboratorId,
  ) => Promise<Result<readonly CollaboratorHistoryEntry[], CollaboratorHistoryReaderError>>;
}>;
