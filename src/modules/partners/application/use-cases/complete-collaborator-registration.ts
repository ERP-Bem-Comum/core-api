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
import type {
  CollaboratorHistoryError,
  CollaboratorHistoryRepository,
} from '#src/modules/partners/application/ports/collaborator-history.ts';
import type { UserNameReader } from '#src/modules/partners/application/ports/user-name-reader.ts';

export type CompleteCollaboratorRegistrationCommand = Readonly<{
  collaboratorId: string;
  /** Usuário do RH que completa — autor da linha de PcD no histórico (spec 131). */
  changedByUserId: string;
}> &
  CompleteRegistrationInput;

export type CompleteCollaboratorRegistrationError =
  | 'complete-collaborator-registration-invalid-id'
  | 'complete-collaborator-registration-not-found'
  | CollaboratorError
  | CollaboratorRepositoryError
  | CollaboratorHistoryError;

export type CompleteCollaboratorRegistrationOutput = Readonly<{
  collaborator: CollaboratorAggregate;
  event: CollaboratorEvent;
}>;

type Deps = Readonly<{
  collaboratorRepo: CollaboratorRepository;
  historyRepo: CollaboratorHistoryRepository;
  userNameReader: UserNameReader;
  clock: Clock;
}>;

export const completeCollaboratorRegistration =
  (deps: Deps) =>
  async (
    cmd: CompleteCollaboratorRegistrationCommand,
  ): Promise<
    Result<CompleteCollaboratorRegistrationOutput, CompleteCollaboratorRegistrationError>
  > => {
    const { collaboratorId, changedByUserId, ...input } = cmd;

    const id = CollaboratorId.rehydrate(collaboratorId);
    if (!id.ok) return err('complete-collaborator-registration-invalid-id');

    const fetched = await deps.collaboratorRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('complete-collaborator-registration-not-found');

    const now = deps.clock.now();
    const transition = Collaborator.completeRegistration(fetched.value, input, now);
    if (!transition.ok) return transition;

    const saved = await deps.collaboratorRepo.save(transition.value.collaborator);
    if (!saved.ok) return saved;

    // Spec 131 (P.O., 23/10/2026): a primeira resposta de PcD entra no histórico — só ela.
    const userName = await deps.userNameReader.getUserName(changedByUserId);
    const recorded = await deps.historyRepo.record({
      collaboratorId,
      eventType: 'CollaboratorRegistrationCompleted',
      before: fetched.value,
      after: transition.value.collaborator,
      occurredAt: now,
      changedBy: { userId: changedByUserId, userName },
      fields: ['pwd'],
    });
    if (!recorded.ok) return recorded;

    return ok({ collaborator: transition.value.collaborator, event: transition.value.event });
  };
