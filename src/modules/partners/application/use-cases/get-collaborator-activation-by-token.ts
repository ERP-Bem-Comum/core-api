/**
 * getCollaboratorActivationByToken — preview público do autocadastro (#43, CA2/CA3). Imperative Shell.
 *
 * token (claro) → minter.hash → findByTokenHash → state(now). Anti-enumeração (espelha o
 * request-password-reset): token inexistente, expirado ou usado retornam slugs distintos mas TODOS
 * mapeados a 404 na borda — nenhum dado de colaborador vaza. Para token pending, busca o colaborador
 * e devolve um preview com o CPF MASCARADO (nunca o CPF completo, CA2). Retorna os slugs de contrato
 * `collaborator-autocadastro-*` direto (a rota só faz o mapping status). ASCII puro (comentários PT).
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
import type {
  CollaboratorInviteTokenRepository,
  CollaboratorInviteTokenRepositoryError,
} from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type {
  CollaboratorRepository,
  CollaboratorRepositoryError,
} from '#src/modules/partners/domain/collaborator/repository.ts';
import type { CollaboratorInviteTokenMinter } from '#src/modules/partners/application/ports/collaborator-invite-token-minter.ts';
import { maskCpf } from './mask-cpf.ts';

export type GetCollaboratorActivationByTokenCommand = Readonly<{ token: string }>;

export type CollaboratorActivationPreview = Readonly<{
  collaboratorId: string;
  name: string;
  email: string;
  cpfMasked: string;
  occupationArea: string;
  role: string;
}>;

export type GetCollaboratorActivationByTokenError =
  | 'collaborator-autocadastro-token-invalid'
  | 'collaborator-autocadastro-token-expired'
  | 'collaborator-autocadastro-token-used'
  | CollaboratorInviteTokenRepositoryError
  | CollaboratorRepositoryError;

type Deps = Readonly<{
  inviteTokenRepo: CollaboratorInviteTokenRepository;
  collaboratorRepo: CollaboratorRepository;
  minter: CollaboratorInviteTokenMinter;
  clock: Clock;
}>;

export const getCollaboratorActivationByToken =
  (deps: Deps) =>
  async (
    cmd: GetCollaboratorActivationByTokenCommand,
  ): Promise<Result<CollaboratorActivationPreview, GetCollaboratorActivationByTokenError>> => {
    const found = await deps.inviteTokenRepo.findByTokenHash(deps.minter.hash(cmd.token));
    if (!found.ok) return found;
    if (found.value === null) return err('collaborator-autocadastro-token-invalid');

    const now = deps.clock.now();
    switch (InviteToken.state(found.value, now)) {
      case 'expired':
        return err('collaborator-autocadastro-token-expired');
      case 'used':
        return err('collaborator-autocadastro-token-used');
      case 'pending':
        break;
    }

    const collaboratorR = await deps.collaboratorRepo.findById(found.value.collaboratorId);
    if (!collaboratorR.ok) return collaboratorR;
    // Token pending mas colaborador removido (improvável c/ soft-delete): trata como token inválido.
    if (collaboratorR.value === null) return err('collaborator-autocadastro-token-invalid');
    const collaborator = collaboratorR.value;

    return ok({
      collaboratorId: String(collaborator.id),
      name: collaborator.name,
      email: collaborator.email,
      cpfMasked: maskCpf(String(collaborator.cpf)),
      occupationArea: collaborator.occupationArea,
      role: collaborator.role,
    });
  };
