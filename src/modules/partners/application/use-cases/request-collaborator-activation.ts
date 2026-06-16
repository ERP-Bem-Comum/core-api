/**
 * requestCollaboratorActivation — dispara o autocadastro de um colaborador (#43, CA1/CA1b).
 * Imperative Shell. Espelha `requestPasswordReset` do auth (mecanismo DUPLICADO — ADR-0006).
 *
 * Sequência: rehydrate id → findById (not-found) → invalida tokens pendentes anteriores (só 1 link
 * válido por vez, CA1b) → emite novo (issue: TTL curto, hash persistido / claro no link) → save →
 * monta a activationUrl a partir de ORIGEM CONFIÁVEL injetada (config do servidor, nunca header Host —
 * anti Host-Header-Injection) → envia pelo mailer. ASCII puro (comentários PT).
 */

import { type Result, ok, err } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as CollaboratorId from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
import * as InviteTokenId from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import type {
  CollaboratorRepository,
  CollaboratorRepositoryError,
} from '#src/modules/partners/domain/collaborator/repository.ts';
import type {
  CollaboratorInviteTokenRepository,
  CollaboratorInviteTokenRepositoryError,
} from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type { CollaboratorInviteTokenMinter } from '#src/modules/partners/application/ports/collaborator-invite-token-minter.ts';
import type {
  CollaboratorActivationMailer,
  CollaboratorActivationMailerError,
} from '#src/modules/partners/application/ports/collaborator-activation-mailer.ts';

export type RequestCollaboratorActivationCommand = Readonly<{ collaboratorId: string }>;

export type RequestCollaboratorActivationError =
  | 'request-collaborator-activation-invalid-id'
  | 'request-collaborator-activation-not-found'
  | CollaboratorRepositoryError
  | CollaboratorInviteTokenRepositoryError
  | CollaboratorActivationMailerError;

type Deps = Readonly<{
  collaboratorRepo: CollaboratorRepository;
  inviteTokenRepo: CollaboratorInviteTokenRepository;
  minter: CollaboratorInviteTokenMinter;
  mailer: CollaboratorActivationMailer;
  clock: Clock;
  inviteTtlSeconds: number;
  /** Origem confiável do link (config do servidor). NUNCA derivada do header Host da request. */
  activationBaseUrl: string;
}>;

export const requestCollaboratorActivation =
  (deps: Deps) =>
  async (
    cmd: RequestCollaboratorActivationCommand,
  ): Promise<Result<void, RequestCollaboratorActivationError>> => {
    const id = CollaboratorId.rehydrate(cmd.collaboratorId);
    if (!id.ok) return err('request-collaborator-activation-invalid-id');

    const fetched = await deps.collaboratorRepo.findById(id.value);
    if (!fetched.ok) return fetched;
    if (fetched.value === null) return err('request-collaborator-activation-not-found');
    const collaborator = fetched.value;
    const now = deps.clock.now();

    // CA1b — invalida tokens pendentes anteriores (só 1 link válido por vez).
    const unused = await deps.inviteTokenRepo.findUnusedByCollaboratorId(collaborator.id);
    if (!unused.ok) return unused;
    for (const token of unused.value) {
      const consumed = InviteToken.consume(token, now);
      if (consumed.ok) {
        const saved = await deps.inviteTokenRepo.save(consumed.value);
        if (!saved.ok) return saved;
      }
    }

    // Emite o novo token.
    const secret = deps.minter.mint();
    const issued = InviteToken.issue({
      id: InviteTokenId.generate(),
      collaboratorId: collaborator.id,
      tokenHash: secret.tokenHash,
      requestedAt: now,
      expiresAt: new Date(now.getTime() + deps.inviteTtlSeconds * 1000),
    });
    if (!issued.ok) return ok(undefined);
    const saved = await deps.inviteTokenRepo.save(issued.value);
    if (!saved.ok) return saved;

    const activationUrl = `${deps.activationBaseUrl}?token=${secret.token}`;
    return deps.mailer.sendActivationLink({
      email: collaborator.email,
      activationUrl,
      recipientName: collaborator.name,
    });
  };
