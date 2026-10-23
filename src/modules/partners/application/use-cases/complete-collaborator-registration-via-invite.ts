/**
 * Use case `completeCollaboratorRegistrationViaInvite` (US5) — passo 2 (POST autocadastro).
 *
 * token → `findByTokenHash` → estado (404 uniforme se desconhecido/expirado/usado) → `findById`
 * → **`verifyCpfPrefix` ANTES de queimar o token** (OWASP: input inválido não queima; CA5 mantém
 * o token válido) → `Collaborator.completeRegistration` → `save` → **`markUsed` atômico**
 * (anti-replay; corrida perdida → 404 token-used). Ordem: validar → completar → persistir →
 * invalidar. Tempo via `Clock`.
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
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
  CollaboratorInviteTokenRepository,
  CollaboratorInviteTokenRepositoryError,
} from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type { CollaboratorInviteTokenMinter } from '../ports/collaborator-invite-token-minter.ts';
import type {
  CollaboratorHistoryError,
  CollaboratorHistoryRepository,
} from '../ports/collaborator-history.ts';
import { verifyCpfPrefix } from './verify-cpf-prefix.ts';

export type CompleteCollaboratorRegistrationViaInviteCommand = Readonly<{
  token: string;
  cpfPrefix: string;
}> &
  CompleteRegistrationInput;

export type CompleteCollaboratorRegistrationViaInviteError =
  | 'collaborator-autocadastro-token-expired'
  | 'collaborator-autocadastro-token-used'
  | 'collaborator-autocadastro-cpf-mismatch'
  | CollaboratorError
  | CollaboratorRepositoryError
  | CollaboratorInviteTokenRepositoryError
  | CollaboratorHistoryError;

export type CompleteCollaboratorRegistrationViaInviteOutput = Readonly<{
  collaborator: CollaboratorAggregate;
  event: CollaboratorEvent;
}>;

type Deps = Readonly<{
  inviteRepo: CollaboratorInviteTokenRepository;
  minter: CollaboratorInviteTokenMinter;
  collaboratorRepo: CollaboratorRepository;
  historyRepo: CollaboratorHistoryRepository;
  clock: Clock;
}>;

// Spec 131: quem responde no autocadastro é o próprio colaborador, que não é usuário do sistema — a
// linha de histórico registra a ORIGEM no lugar do autor.
const AUTOCADASTRO_AUTHOR = { userId: null, userName: 'Autocadastro' } as const;

export const completeCollaboratorRegistrationViaInvite =
  (deps: Deps) =>
  async (
    cmd: CompleteCollaboratorRegistrationViaInviteCommand,
  ): Promise<
    Result<
      CompleteCollaboratorRegistrationViaInviteOutput,
      CompleteCollaboratorRegistrationViaInviteError
    >
  > => {
    const { token, cpfPrefix, ...input } = cmd;

    const found = await deps.inviteRepo.findByTokenHash(deps.minter.hash(token));
    if (!found.ok) return found;
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

    const fetched = await deps.collaboratorRepo.findById(found.value.collaboratorId);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('collaborator-autocadastro-token-expired');

    // CPF confere ANTES de qualquer mudança/queima de token.
    const verified = verifyCpfPrefix(fetched.value.cpf, cpfPrefix);
    if (!verified.ok) return err('collaborator-autocadastro-cpf-mismatch');

    const transition = Collaborator.completeRegistration(fetched.value, input, now);
    if (!transition.ok) return transition;

    // Claim atômico do token ANTES de persistir (W2/M1): fecha a janela de double-complete sob
    // concorrência. Input já validado (CPF + domínio puro acima) → o token só queima com input
    // válido. false = outra requisição venceu a corrida → 404 token-used.
    const claimed = await deps.inviteRepo.markUsed(found.value.id, now);
    if (!claimed.ok) return claimed;
    if (!claimed.value) return err('collaborator-autocadastro-token-used');

    const saved = await deps.collaboratorRepo.save(transition.value.collaborator);
    if (!saved.ok) return saved;

    // Spec 131 (P.O., 23/10/2026): a primeira resposta de PcD entra no histórico — só ela; os demais
    // campos pessoais seguem fora do histórico ao completar o cadastro.
    const recorded = await deps.historyRepo.record({
      collaboratorId: String(fetched.value.id),
      eventType: 'CollaboratorRegistrationCompleted',
      before: fetched.value,
      after: transition.value.collaborator,
      occurredAt: now,
      changedBy: AUTOCADASTRO_AUTHOR,
      fields: ['pwd'],
    });
    if (!recorded.ok) return recorded;

    return ok({ collaborator: transition.value.collaborator, event: transition.value.event });
  };
