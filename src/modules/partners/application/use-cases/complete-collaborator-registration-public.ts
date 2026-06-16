/**
 * Use case `completeCollaboratorRegistrationPublic` — conclusão do autocadastro público (#43, CA4/CA5).
 *
 * EVOLUIU (era órfão, recebia {collaboratorId, cpfPrefix}): agora consome o token uso-único.
 * Sequência canônica (validar ANTES de consumir, para cpf-mismatch NÃO queimar o token — CA5):
 *   hash(token) → findByTokenHash → state(now) (expired/used → slug) → fetch colaborador →
 *   verifyCpfPrefix (mismatch → slug, token preservado) → Collaborator.completeRegistration →
 *   save colaborador → consume(token) → save token usado (one-time). Tempo via `Clock`.
 *
 * Retorna os slugs de contrato `collaborator-autocadastro-*` direto (a rota só faz o mapping
 * status). O mecanismo de token é DUPLICADO no partners, não importado do auth (ADR-0006/CA8).
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as Collaborator from '#src/modules/partners/domain/collaborator/collaborator.ts';
import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
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
  CollaboratorInviteTokenRepository,
  CollaboratorInviteTokenRepositoryError,
} from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type { CollaboratorInviteTokenMinter } from '#src/modules/partners/application/ports/collaborator-invite-token-minter.ts';
import { verifyCpfPrefix } from './verify-cpf-prefix.ts';

export type CompleteCollaboratorRegistrationPublicCommand = Readonly<{
  token: string;
  cpfPrefix: string;
}> &
  CompleteRegistrationInput;

export type CompleteCollaboratorRegistrationPublicError =
  | 'collaborator-autocadastro-token-invalid'
  | 'collaborator-autocadastro-token-expired'
  | 'collaborator-autocadastro-token-used'
  | 'collaborator-autocadastro-cpf-mismatch'
  | CollaboratorError
  | CollaboratorRepositoryError
  | CollaboratorInviteTokenRepositoryError;

export type CompleteCollaboratorRegistrationPublicOutput = Readonly<{
  collaborator: CollaboratorAggregate;
  event: CollaboratorEvent;
}>;

type Deps = Readonly<{
  collaboratorRepo: CollaboratorRepository;
  inviteTokenRepo: CollaboratorInviteTokenRepository;
  minter: CollaboratorInviteTokenMinter;
  clock: Clock;
}>;

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
    const { token: rawToken, cpfPrefix, ...input } = cmd;

    const found = await deps.inviteTokenRepo.findByTokenHash(deps.minter.hash(rawToken));
    if (!found.ok) return found;
    if (found.value === null) return err('collaborator-autocadastro-token-invalid');
    const token = found.value;

    const now = deps.clock.now();
    // Estado do token ANTES de qualquer mutação (não queima por identidade/senha).
    switch (InviteToken.state(token, now)) {
      case 'expired':
        return err('collaborator-autocadastro-token-expired');
      case 'used':
        return err('collaborator-autocadastro-token-used');
      case 'pending':
        break;
    }

    const fetched = await deps.collaboratorRepo.findById(token.collaboratorId);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('collaborator-autocadastro-token-invalid');

    // CA5 — cpf-mismatch NÃO consome o token (não queima por falha de identidade).
    const verified = verifyCpfPrefix(fetched.value.cpf, cpfPrefix);
    if (!verified.ok) return err('collaborator-autocadastro-cpf-mismatch');

    const transition = Collaborator.completeRegistration(fetched.value, input, now);
    if (!transition.ok) return transition;

    const saved = await deps.collaboratorRepo.save(transition.value.collaborator);
    if (!saved.ok) return saved;

    // One-time: marca o token usado APÓS a conclusão bem-sucedida (CA4).
    const consumed = InviteToken.consume(token, now);
    if (!consumed.ok) {
      // Concorrência rara: token consumido entre o state() e aqui. Mapeia ao slug used.
      return err('collaborator-autocadastro-token-used');
    }
    const savedToken = await deps.inviteTokenRepo.save(consumed.value);
    if (!savedToken.ok) return savedToken;

    return ok({ collaborator: transition.value.collaborator, event: transition.value.event });
  };
