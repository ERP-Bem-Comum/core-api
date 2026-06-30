/**
 * Use case `issueCollaboratorInvite` (US5 + PARTNERS-INVITE-DOMAIN-EVENT / ADR-0047) — emite o
 * convite de autocadastro.
 *
 * Composto na ROTA após `registerCollaborator` ter sucesso (não dentro do register, p/ não
 * disparar convite em `importCollaborators`). `mint` (CSPRNG) → persiste só o `tokenHash` →
 * emite o evento de dominio `CollaboratorInvited` no `par_email_outbox` na MESMA transacao do save
 * (atomicidade — ADR-0015, via `inviteRepo.saveWithEvents`). O e-mail e enviado pelo CONSUMIDOR
 * (worker email-dispatch), NAO mais por um mailer sincrono aqui (ADR-0047 — atomicidade do disparo).
 * `autocadastroBaseUrl` vem de config confiável do servidor (NUNCA header `Host` — anti
 * Host-Header-Injection). Tempo via `Clock`.
 */

import type { Result } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
import * as InviteTokenId from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type {
  CollaboratorInviteTokenRepository,
  CollaboratorInviteTokenRepositoryError,
} from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type { CollaboratorInviteTokenMinter } from '../ports/collaborator-invite-token-minter.ts';
import { collaboratorInvitedMessage } from '../email-events.ts';

const DAY_MS = 86_400_000;

export type IssueCollaboratorInviteCommand = Readonly<{
  collaboratorId: CollaboratorId;
  email: string;
  recipientName: string;
}>;

export type IssueCollaboratorInviteError =
  | InviteToken.CollaboratorInviteTokenError
  | CollaboratorInviteTokenRepositoryError;

type Deps = Readonly<{
  inviteRepo: CollaboratorInviteTokenRepository;
  minter: CollaboratorInviteTokenMinter;
  clock: Clock;
  autocadastroBaseUrl: string;
  inviteTtlDays: number;
}>;

export const issueCollaboratorInvite =
  (deps: Deps) =>
  async (
    cmd: IssueCollaboratorInviteCommand,
  ): Promise<Result<void, IssueCollaboratorInviteError>> => {
    const secret = deps.minter.mint();
    const now = deps.clock.now();
    const expiresAt = new Date(now.getTime() + deps.inviteTtlDays * DAY_MS);

    const token = InviteToken.issue({
      id: InviteTokenId.generate(),
      collaboratorId: cmd.collaboratorId,
      tokenHash: secret.tokenHash,
      issuedAt: now,
      expiresAt,
    });
    if (!token.ok) return token;

    const url = new URL(deps.autocadastroBaseUrl);
    url.searchParams.set('token', secret.token);

    // Emite o evento de dominio CollaboratorInvited na MESMA tx do save do invite-token: ambos
    // persistem ou nenhum (atomicidade — ADR-0015). O envio do e-mail e responsabilidade do
    // consumidor (worker email-dispatch), nao deste use case.
    const event = collaboratorInvitedMessage({
      collaboratorId: String(cmd.collaboratorId),
      email: cmd.email,
      autocadastroUrl: url.toString(),
      recipientName: cmd.recipientName,
      occurredAt: now,
    });

    return deps.inviteRepo.saveWithEvents(token.value, [event]);
  };
