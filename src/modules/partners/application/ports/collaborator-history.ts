/**
 * Port `CollaboratorHistoryRepository` — audit trail do Colaborador (US4 feature 015).
 *
 * `record(before, after, ctx)`: o ADAPTER computa o diff por campo (`diffCollaborator`), resolve
 * o label PT, gera os ids e persiste — uma linha por campo alterado (consistência forte, chamado
 * pelo use case logo após o save). Diff vazio → no-op.
 * `listByCollaborator`: leitura para o export CSV, ordenada por `occurredAt`.
 *
 * Erro único `collaborator-repo-unavailable` (→ 503 na borda), espelhando `CollaboratorRepository`.
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { Collaborator } from '#src/modules/partners/domain/collaborator/types.ts';

export type CollaboratorHistoryError = 'collaborator-repo-unavailable';

/** Tipo de evento que originou o diff (rastreabilidade). */
export type CollaboratorHistoryEventType =
  | 'CollaboratorEdited'
  | 'CollaboratorDeactivated'
  | 'CollaboratorReactivated';

/** Entrada de histórico já materializada (uma por campo alterado). */
export type CollaboratorHistoryEntry = Readonly<{
  id: string;
  collaboratorId: string;
  eventType: CollaboratorHistoryEventType;
  fieldName: string;
  fieldLabel: string;
  valueBefore: string | null;
  valueAfter: string | null;
  occurredAt: Date;
}>;

export type RecordHistoryInput = Readonly<{
  collaboratorId: string;
  eventType: CollaboratorHistoryEventType;
  before: Collaborator;
  after: Collaborator;
  occurredAt: Date;
}>;

export type CollaboratorHistoryRepository = Readonly<{
  record: (input: RecordHistoryInput) => Promise<Result<void, CollaboratorHistoryError>>;
  listByCollaborator: (
    collaboratorId: string,
  ) => Promise<Result<readonly CollaboratorHistoryEntry[], CollaboratorHistoryError>>;
}>;
