/**
 * Use case `registerCollaborator` — cria um colaborador (nasce Active + PreRegistration).
 *
 * Sequência: `Collaborator.register` (valida nome, email, role, CPF, occupationArea,
 * employmentRelationship) → guard de CPF duplicado (`findByCpf`) e email duplicado
 * (`findByEmail`) → `save`. Tempo injetado via `Clock`. Curried `(deps) => (cmd)`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import type {
  ActiveCollaborator,
  CollaboratorTerritoryInput,
} from '#src/modules/partners/domain/collaborator/types.ts';
import type {
  BankAccountInput,
  PixKeyInput,
} from '#src/modules/partners/domain/supplier/payment-target.ts';
import type { CollaboratorEvent } from '#src/modules/partners/domain/collaborator/events.ts';
import type { CollaboratorError } from '#src/modules/partners/domain/collaborator/errors.ts';
import type {
  CollaboratorRepository,
  CollaboratorRepositoryError,
} from '#src/modules/partners/domain/collaborator/repository.ts';

export type RegisterCollaboratorCommand = Readonly<{
  name: string;
  email: string;
  cpf: string;
  occupationArea: string;
  role: string;
  startOfContract: Date;
  employmentRelationship: string;
  // TERRITÓRIO (#42) e BANCÁRIO (#40) opcionais no pré-cadastro.
  territory?: CollaboratorTerritoryInput | null;
  bankAccount?: BankAccountInput | null;
  pixKey?: PixKeyInput | null;
}>;

export type RegisterCollaboratorError =
  | 'register-collaborator-cpf-duplicate'
  | 'register-collaborator-email-duplicate'
  | CollaboratorError
  | CollaboratorRepositoryError;

export type RegisterCollaboratorOutput = Readonly<{
  collaborator: ActiveCollaborator;
  event: CollaboratorEvent;
}>;

type Deps = Readonly<{ collaboratorRepo: CollaboratorRepository; clock: Clock }>;

export const registerCollaborator =
  (deps: Deps) =>
  async (
    cmd: RegisterCollaboratorCommand,
  ): Promise<Result<RegisterCollaboratorOutput, RegisterCollaboratorError>> => {
    const registered = Collaborator.register({
      id: CollaboratorId.generate(),
      name: cmd.name,
      email: cmd.email,
      cpf: cmd.cpf,
      occupationArea: cmd.occupationArea,
      role: cmd.role,
      startOfContract: cmd.startOfContract,
      employmentRelationship: cmd.employmentRelationship,
      territory: cmd.territory ?? null,
      bankAccount: cmd.bankAccount ?? null,
      pixKey: cmd.pixKey ?? null,
      registeredAt: deps.clock.now(),
    });
    if (!registered.ok) return registered;

    const byCpf = await deps.collaboratorRepo.findByCpf(registered.value.collaborator.cpf);
    if (!byCpf.ok) return byCpf;
    if (byCpf.value !== null) return err('register-collaborator-cpf-duplicate');

    const byEmail = await deps.collaboratorRepo.findByEmail(registered.value.collaborator.email);
    if (!byEmail.ok) return byEmail;
    if (byEmail.value !== null) return err('register-collaborator-email-duplicate');

    const saved = await deps.collaboratorRepo.save(registered.value.collaborator);
    if (!saved.ok) return saved;

    return ok({ collaborator: registered.value.collaborator, event: registered.value.event });
  };
