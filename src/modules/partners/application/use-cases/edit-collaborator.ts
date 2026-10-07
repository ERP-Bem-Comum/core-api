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
import type {
  CollaboratorHistoryRepository,
  CollaboratorHistoryError,
} from '#src/modules/partners/application/ports/collaborator-history.ts';
import type { UserNameReader } from '#src/modules/partners/application/ports/user-name-reader.ts';
import type {
  BankAccountInput,
  PixKeyInput,
} from '#src/modules/partners/domain/shared/payment-target.ts';

export type EditCollaboratorCommand = Readonly<{
  collaboratorId: string;
  canEditSensitive: boolean;
  /** Usuário autenticado que edita — autor das linhas de histórico (#1029). */
  changedByUserId: string;
  name: string;
  email: string;
  cpf: string;
  occupationArea: string;
  role: string;
  startOfContract: Date;
  employmentRelationship: string;
  /** #1029: ausente ou `null` mantém o gravado; objeto valida e substitui. */
  bankAccount?: BankAccountInput | null | undefined;
  pixKey?: PixKeyInput | null | undefined;
}>;

export type EditCollaboratorError =
  | 'edit-collaborator-invalid-id'
  | 'edit-collaborator-not-found'
  | 'edit-collaborator-cpf-duplicate'
  | 'edit-collaborator-email-duplicate'
  | 'edit-collaborator-sensitive-forbidden'
  | CollaboratorError
  | CollaboratorRepositoryError
  | CollaboratorHistoryError;

export type EditCollaboratorOutput = Readonly<{
  collaborator: CollaboratorAggregate;
  event: CollaboratorEvent;
}>;

type Deps = Readonly<{
  collaboratorRepo: CollaboratorRepository;
  historyRepo: CollaboratorHistoryRepository;
  userNameReader: UserNameReader;
  clock: Clock;
}>;

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

    const now = deps.clock.now();
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
        bankAccount: cmd.bankAccount,
        pixKey: cmd.pixKey,
      },
      now,
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

    // Audit trail (US4) — diff por campo, consistência forte (logo após o save). Autor (#1029): id
    // sempre; nome no momento da ação, ou null se o auth não responder (não derruba a edição).
    const userName = await deps.userNameReader.getUserName(cmd.changedByUserId);
    const recorded = await deps.historyRepo.record({
      collaboratorId: cmd.collaboratorId,
      eventType: 'CollaboratorEdited',
      before: current,
      after: next,
      occurredAt: now,
      changedBy: { userId: cmd.changedByUserId, userName },
    });
    if (!recorded.ok) return recorded;

    return ok({ collaborator: next, event: edited.value.event });
  };
