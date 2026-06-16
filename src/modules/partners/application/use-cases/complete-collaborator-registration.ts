/**
 * Use case `completeCollaboratorRegistration` — PreRegistration → Complete.
 * rehydrate id → `findById` (not-found) → `Collaborator.completeRegistration(input, now)` → `save`.
 *
 * Sem o fluxo público de auto-cadastro (check dos 3 primeiros dígitos do CPF) — esse
 * pertence ao ticket HTTP/CLI futuro. Aqui é a transição de estado pura sobre o agregado.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import type {
  Collaborator as CollaboratorAggregate,
  CompleteRegistrationInput,
} from '#src/modules/partners/domain/collaborator/types.ts';
import type { CollaboratorEvent } from '#src/modules/partners/domain/collaborator/events.ts';
import type { CollaboratorError } from '#src/modules/partners/domain/collaborator/errors.ts';
import type {
  CollaboratorRepository,
  CollaboratorRepositoryError,
} from '#src/modules/partners/domain/collaborator/repository.ts';
import type { CollaboratorHistoryRepository } from '#src/modules/partners/domain/collaborator/collaborator-history-repository.ts';
import { appendCollaboratorHistory } from './collaborator-history-append.ts';

export type CompleteCollaboratorRegistrationCommand = Readonly<{ collaboratorId: string }> &
  CompleteRegistrationInput;

export type CompleteCollaboratorRegistrationError =
  | 'complete-collaborator-registration-invalid-id'
  | 'complete-collaborator-registration-not-found'
  | CollaboratorError
  | CollaboratorRepositoryError;

export type CompleteCollaboratorRegistrationOutput = Readonly<{
  collaborator: CollaboratorAggregate;
  event: CollaboratorEvent;
}>;

type Deps = Readonly<{
  collaboratorRepo: CollaboratorRepository;
  historyRepo: CollaboratorHistoryRepository;
  clock: Clock;
}>;

export const completeCollaboratorRegistration =
  (deps: Deps) =>
  async (
    cmd: CompleteCollaboratorRegistrationCommand,
  ): Promise<
    Result<CompleteCollaboratorRegistrationOutput, CompleteCollaboratorRegistrationError>
  > => {
    const { collaboratorId, ...input } = cmd;

    const id = CollaboratorId.rehydrate(collaboratorId);
    if (!id.ok) return err('complete-collaborator-registration-invalid-id');

    const fetched = await deps.collaboratorRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('complete-collaborator-registration-not-found');

    const transition = Collaborator.completeRegistration(fetched.value, input, deps.clock.now());
    if (!transition.ok) return transition;

    const saved = await deps.collaboratorRepo.save(transition.value.collaborator);
    if (!saved.ok) return saved;

    // Histórico append-only (#44): before = PreRegistration, after = Complete.
    const history = await appendCollaboratorHistory({
      historyRepo: deps.historyRepo,
      changeType: 'Complementacao',
      before: fetched.value,
      after: transition.value.collaborator,
      occurredAt: transition.value.event.occurredAt,
    });
    if (!history.ok) return history;

    return ok({ collaborator: transition.value.collaborator, event: transition.value.event });
  };
