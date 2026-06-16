/**
 * Helper de application compartilhado pelos 4 use cases de escrita do Colaborador (#44):
 * monta a `CollaboratorHistoryEntry` (snapshot before/after genérico) e a apenda.
 *
 * Consistência forte (decisão do plano): a falha do append é propagada como
 * `collaborator-repo-unavailable` (o agregado já foi salvo; o append vem logo após). Reusa o
 * mesmo slug transiente do `CollaboratorRepository`, mapeado a 503 na borda.
 *
 * Função pura de orquestração — gera id/occurredAt a partir do `clock`/gerador injetados; sem
 * `Date.now()`/`randomUUID` direto (testabilidade).
 */

import { type Result, ok } from '#src/shared/index.ts';
import * as CollaboratorHistoryId from '#src/modules/partners/domain/collaborator/collaborator-history-id.ts';
import { make } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import { snapshotOf } from '#src/modules/partners/domain/collaborator/collaborator-snapshot.ts';
import type { CollaboratorChangeType } from '#src/modules/partners/domain/collaborator/collaborator-history.ts';
import type { Collaborator } from '#src/modules/partners/domain/collaborator/types.ts';
import type { CollaboratorHistoryRepository } from '#src/modules/partners/domain/collaborator/collaborator-history-repository.ts';
import type { CollaboratorRepositoryError } from '#src/modules/partners/domain/collaborator/repository.ts';

export type AppendCollaboratorHistoryInput = Readonly<{
  historyRepo: CollaboratorHistoryRepository;
  changeType: CollaboratorChangeType;
  before: Collaborator;
  after: Collaborator;
  occurredAt: Date;
  changedByRef?: string | null;
}>;

export const appendCollaboratorHistory = async (
  input: AppendCollaboratorHistoryInput,
): Promise<Result<void, CollaboratorRepositoryError>> => {
  const entry = make({
    id: CollaboratorHistoryId.generate(),
    collaboratorRef: input.after.id,
    changeType: input.changeType,
    before: snapshotOf(input.before),
    after: snapshotOf(input.after),
    occurredAt: input.occurredAt,
    changedByRef: input.changedByRef ?? null,
  });
  const appended = await input.historyRepo.append(entry);
  if (!appended.ok) return appended;
  return ok(undefined);
};
