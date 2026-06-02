/**
 * Use case `completeCollaboratorRegistrationPublic` — passo 2 do fluxo público.
 *
 * rehydrate id → `findById` (not-found) → `verifyCpfPrefix` (**revalida** o prefixo do CPF:
 * defense-in-depth; o legado não revalida no POST — IDOR latente) → `Collaborator.completeRegistration`
 * → `save`. Tempo via `Clock`. Curried `(deps) => (cmd)`.
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
import { verifyCpfPrefix, type CpfPrefixError } from './verify-cpf-prefix.ts';

export type CompleteCollaboratorRegistrationPublicCommand = Readonly<{
  collaboratorId: string;
  cpfPrefix: string;
}> &
  CompleteRegistrationInput;

export type CompleteCollaboratorRegistrationPublicError =
  | 'public-complete-invalid-id'
  | 'public-complete-not-found'
  | CpfPrefixError
  | CollaboratorError
  | CollaboratorRepositoryError;

export type CompleteCollaboratorRegistrationPublicOutput = Readonly<{
  collaborator: CollaboratorAggregate;
  event: CollaboratorEvent;
}>;

type Deps = Readonly<{ collaboratorRepo: CollaboratorRepository; clock: Clock }>;

export const completeCollaboratorRegistrationPublic =
  (deps: Deps) =>
  async (
    cmd: CompleteCollaboratorRegistrationPublicCommand,
  ): Promise<
    Result<
      CompleteCollaboratorRegistrationPublicOutput,
      CompleteCollaboratorRegistrationPublicError
    >
  > => {
    const { collaboratorId, cpfPrefix, ...input } = cmd;

    const id = CollaboratorId.rehydrate(collaboratorId);
    if (!id.ok) return err('public-complete-invalid-id');

    const fetched = await deps.collaboratorRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('public-complete-not-found');

    const verified = verifyCpfPrefix(fetched.value.cpf, cpfPrefix);
    if (!verified.ok) return verified;

    const transition = Collaborator.completeRegistration(fetched.value, input, deps.clock.now());
    if (!transition.ok) return transition;

    const saved = await deps.collaboratorRepo.save(transition.value.collaborator);
    if (!saved.ok) return saved;

    return ok({ collaborator: transition.value.collaborator, event: transition.value.event });
  };
