/**
 * Use case `reactivateCollaborator` — Inactive → Active.
 * rehydrate id → `findById` (not-found) → `Collaborator.reactivate(now)` → `save`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import type { ActiveCollaborator } from '#src/modules/partners/domain/collaborator/types.ts';
import type { CollaboratorEvent } from '#src/modules/partners/domain/collaborator/events.ts';
import type { CollaboratorError } from '#src/modules/partners/domain/collaborator/errors.ts';
import type {
  CollaboratorRepository,
  CollaboratorRepositoryError,
} from '#src/modules/partners/domain/collaborator/repository.ts';

export type ReactivateCollaboratorCommand = Readonly<{ collaboratorId: string }>;

export type ReactivateCollaboratorError =
  | 'reactivate-collaborator-invalid-id'
  | 'reactivate-collaborator-not-found'
  | CollaboratorError
  | CollaboratorRepositoryError;

export type ReactivateCollaboratorOutput = Readonly<{
  collaborator: ActiveCollaborator;
  event: CollaboratorEvent;
}>;

type Deps = Readonly<{ collaboratorRepo: CollaboratorRepository; clock: Clock }>;

export const reactivateCollaborator =
  (deps: Deps) =>
  async (
    cmd: ReactivateCollaboratorCommand,
  ): Promise<Result<ReactivateCollaboratorOutput, ReactivateCollaboratorError>> => {
    const id = CollaboratorId.rehydrate(cmd.collaboratorId);
    if (!id.ok) return err('reactivate-collaborator-invalid-id');

    const fetched = await deps.collaboratorRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('reactivate-collaborator-not-found');

    const transition = Collaborator.reactivate(fetched.value, deps.clock.now());
    if (!transition.ok) return transition;

    const saved = await deps.collaboratorRepo.save(transition.value.collaborator);
    if (!saved.ok) return saved;

    return ok({ collaborator: transition.value.collaborator, event: transition.value.event });
  };
