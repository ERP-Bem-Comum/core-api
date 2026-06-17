/**
 * Use case `viewCollaboratorInvite` (US5) — passo 1 do fluxo público (GET autocadastro).
 *
 * Hasheia o token claro → `findByTokenHash`. Token desconhecido/expirado/usado → erro de 404
 * UNIFORME (anti-enumeração OWASP: não vaza existência). Pendente → devolve preview de
 * pré-cadastro com **CPF mascarado** (defesa contra vazamento). Tempo via `Clock`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
import type {
  CollaboratorRepository,
  CollaboratorRepositoryError,
} from '#src/modules/partners/domain/collaborator/repository.ts';
import type {
  CollaboratorInviteTokenRepository,
  CollaboratorInviteTokenRepositoryError,
} from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type { CollaboratorInviteTokenMinter } from '../ports/collaborator-invite-token-minter.ts';

export type ViewCollaboratorInviteCommand = Readonly<{ token: string }>;

export type CollaboratorInvitePreview = Readonly<{
  collaboratorId: string;
  name: string;
  cpfMasked: string;
}>;

export type ViewCollaboratorInviteError =
  | 'collaborator-autocadastro-token-expired'
  | 'collaborator-autocadastro-token-used'
  | CollaboratorInviteTokenRepositoryError
  | CollaboratorRepositoryError;

type Deps = Readonly<{
  inviteRepo: CollaboratorInviteTokenRepository;
  minter: CollaboratorInviteTokenMinter;
  collaboratorRepo: CollaboratorRepository;
  clock: Clock;
}>;

/** Mascara todos os dígitos exceto os 2 últimos: `11144477735` → `*********35`. */
const maskCpf = (cpf: string): string => cpf.replace(/\d(?=\d{2})/g, '*');

export const viewCollaboratorInvite =
  (deps: Deps) =>
  async (
    cmd: ViewCollaboratorInviteCommand,
  ): Promise<Result<CollaboratorInvitePreview, ViewCollaboratorInviteError>> => {
    const found = await deps.inviteRepo.findByTokenHash(deps.minter.hash(cmd.token));
    if (!found.ok) return found;
    // Desconhecido == expirado (404 uniforme; não distingue "nunca existiu" de "expirou").
    if (found.value === null) return err('collaborator-autocadastro-token-expired');

    const now = deps.clock.now();
    switch (InviteToken.state(found.value, now)) {
      case 'used':
        return err('collaborator-autocadastro-token-used');
      case 'expired':
        return err('collaborator-autocadastro-token-expired');
      case 'pending':
        break;
    }

    const collab = await deps.collaboratorRepo.findById(found.value.collaboratorId);
    if (!collab.ok) return collab;
    if (collab.value === null) return err('collaborator-autocadastro-token-expired');

    return ok({
      collaboratorId: collab.value.id,
      name: collab.value.name,
      cpfMasked: maskCpf(String(collab.value.cpf)),
    });
  };
