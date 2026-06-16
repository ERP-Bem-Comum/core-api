/**
 * Use case `deactivateCollaborator` — Active → Inactive (soft-delete; exige `disableBy`).
 * rehydrate id → `findById` (not-found) → `Collaborator.deactivate(disableBy, now)` → `save`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import type { Collaborator as CollaboratorAggregate } from '#src/modules/partners/domain/collaborator/types.ts';
import type { CollaboratorEvent } from '#src/modules/partners/domain/collaborator/events.ts';
import type { CollaboratorError } from '#src/modules/partners/domain/collaborator/errors.ts';
import type {
  CollaboratorRepository,
  CollaboratorRepositoryError,
} from '#src/modules/partners/domain/collaborator/repository.ts';
import type { CollaboratorHistoryRepository } from '#src/modules/partners/domain/collaborator/collaborator-history-repository.ts';
import { appendCollaboratorHistory } from './collaborator-history-append.ts';

export type DeactivateCollaboratorCommand = Readonly<{ collaboratorId: string; disableBy: string }>;

export type DeactivateCollaboratorError =
  | 'deactivate-collaborator-invalid-id'
  | 'deactivate-collaborator-not-found'
  | CollaboratorError
  | CollaboratorRepositoryError;

// `Collaborator` (não `InactiveCollaborator`): o domínio `Collaborator.deactivate` não
// estreita o retorno (diferente de `Supplier.deactivate`). Alinhado à assinatura do domínio.
export type DeactivateCollaboratorOutput = Readonly<{
  collaborator: CollaboratorAggregate;
  event: CollaboratorEvent;
}>;

type Deps = Readonly<{
  collaboratorRepo: CollaboratorRepository;
  historyRepo: CollaboratorHistoryRepository;
  clock: Clock;
}>;

export const deactivateCollaborator =
  (deps: Deps) =>
  async (
    cmd: DeactivateCollaboratorCommand,
  ): Promise<Result<DeactivateCollaboratorOutput, DeactivateCollaboratorError>> => {
    const id = CollaboratorId.rehydrate(cmd.collaboratorId);
    if (!id.ok) return err('deactivate-collaborator-invalid-id');

    const fetched = await deps.collaboratorRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('deactivate-collaborator-not-found');

    const transition = Collaborator.deactivate(fetched.value, cmd.disableBy, deps.clock.now());
    if (!transition.ok) return transition;

    const saved = await deps.collaboratorRepo.save(transition.value.collaborator);
    if (!saved.ok) return saved;

    // Histórico append-only (#44): before = estado Active, after = estado Inactive.
    const history = await appendCollaboratorHistory({
      historyRepo: deps.historyRepo,
      changeType: 'Desativacao',
      before: fetched.value,
      after: transition.value.collaborator,
      occurredAt: transition.value.event.occurredAt,
    });
    if (!history.ok) return history;

    return ok({ collaborator: transition.value.collaborator, event: transition.value.event });
  };
