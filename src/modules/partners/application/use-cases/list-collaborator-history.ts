/**
 * Use case `listCollaboratorHistory` — lista o histórico de alterações de um colaborador (#44).
 *
 * Sequência: rehydrate id (400 se mal-formado) → `historyReader.listByCollaborator` (DESC).
 * id desconhecido/sem histórico → lista vazia (não é erro). Reusa o reader (read-side).
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type { CollaboratorHistoryEntry } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type {
  CollaboratorHistoryReader,
  CollaboratorHistoryReaderError,
} from '#src/modules/partners/application/ports/collaborator-history-reader.ts';

export type ListCollaboratorHistoryCommand = Readonly<{ collaboratorId: string }>;

export type ListCollaboratorHistoryError =
  | 'list-collaborator-history-invalid-id'
  | CollaboratorHistoryReaderError;

type Deps = Readonly<{ historyReader: CollaboratorHistoryReader }>;

export const listCollaboratorHistory =
  (deps: Deps) =>
  async (
    cmd: ListCollaboratorHistoryCommand,
  ): Promise<Result<readonly CollaboratorHistoryEntry[], ListCollaboratorHistoryError>> => {
    const id = CollaboratorId.rehydrate(cmd.collaboratorId);
    if (!id.ok) return err('list-collaborator-history-invalid-id');

    const listed = await deps.historyReader.listByCollaborator(id.value);
    if (!listed.ok) return listed;
    return ok(listed.value);
  };
