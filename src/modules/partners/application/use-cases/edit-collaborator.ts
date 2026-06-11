/**
 * Use case `editCollaborator` — edição cadastral (PUT total) com RBAC do campo vital (CPF).
 * Espelha `editSupplier`/`editFinancier`. Vital = cpf (exige canEditSensitive). Email é
 * não-vital, mas único: mudança para um já usado → `edit-collaborator-email-duplicate` (409),
 * independente da permissão. Regra no use case (usa o writer).
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

export type EditCollaboratorCommand = Readonly<{
  collaboratorId: string;
  canEditSensitive: boolean;
  name: string;
  email: string;
  cpf: string;
  occupationArea: string;
  role: string;
  startOfContract: Date;
  employmentRelationship: string;
  // R3 — vínculo a Programa (UUID v4|null). Ausente/undefined = preserva; `null` = desvincula.
  programId?: string | null | undefined;
}>;

export type EditCollaboratorError =
  | 'edit-collaborator-invalid-id'
  | 'edit-collaborator-not-found'
  | 'edit-collaborator-cpf-duplicate'
  | 'edit-collaborator-email-duplicate'
  | 'edit-collaborator-sensitive-forbidden'
  | CollaboratorError
  | CollaboratorRepositoryError;

export type EditCollaboratorOutput = Readonly<{
  collaborator: CollaboratorAggregate;
  event: CollaboratorEvent;
}>;

type Deps = Readonly<{ collaboratorRepo: CollaboratorRepository; clock: Clock }>;

export const editCollaborator =
  (deps: Deps) =>
  async (
    cmd: EditCollaboratorCommand,
  ): Promise<Result<EditCollaboratorOutput, EditCollaboratorError>> => {
    const id = CollaboratorId.rehydrate(cmd.collaboratorId);
    if (!id.ok) return err('edit-collaborator-invalid-id');

    const fetched = await deps.collaboratorRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('edit-collaborator-not-found');
    const current = fetched.value;

    const edited = Collaborator.edit(
      current,
      {
        name: cmd.name,
        email: cmd.email,
        cpf: cmd.cpf,
        occupationArea: cmd.occupationArea,
        role: cmd.role,
        startOfContract: cmd.startOfContract,
        employmentRelationship: cmd.employmentRelationship,
        // Repassa apenas se veio no comando — ausente preserva o vínculo atual (domínio decide via undefined).
        ...(cmd.programId !== undefined ? { programId: cmd.programId } : {}),
      },
      deps.clock.now(),
    );
    if (!edited.ok) return edited;
    const next = edited.value.collaborator;

    // CPF (vital): só super-role altera; re-checa unicidade.
    if (String(current.cpf) !== String(next.cpf)) {
      if (!cmd.canEditSensitive) return err('edit-collaborator-sensitive-forbidden');
      const byCpf = await deps.collaboratorRepo.findByCpf(next.cpf);
      if (!byCpf.ok) return byCpf;
      if (byCpf.value !== null && String(byCpf.value.id) !== String(id.value)) {
        return err('edit-collaborator-cpf-duplicate');
      }
    }

    // Email (não-vital): único — mudança para um já usado por outro → conflito.
    if (current.email !== next.email) {
      const byEmail = await deps.collaboratorRepo.findByEmail(next.email);
      if (!byEmail.ok) return byEmail;
      if (byEmail.value !== null && String(byEmail.value.id) !== String(id.value)) {
        return err('edit-collaborator-email-duplicate');
      }
    }

    const saved = await deps.collaboratorRepo.save(next);
    if (!saved.ok) return saved;

    return ok({ collaborator: next, event: edited.value.event });
  };
