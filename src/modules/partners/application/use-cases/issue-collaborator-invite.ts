/**
 * Use case `issueCollaboratorInvite` (US5) — emite o convite de autocadastro.
 *
 * Composto na ROTA após `registerCollaborator` ter sucesso (não dentro do register, p/ não
 * disparar convite em `importCollaborators`). `mint` (CSPRNG) → persiste só o `tokenHash` →
 * envia o link (token CLARO) por e-mail. `autocadastroBaseUrl` vem de config confiável do
 * servidor (NUNCA header `Host` — anti Host-Header-Injection). Tempo via `Clock`.
 */

import { type Result, ok } from '#src/shared/index.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as InviteToken from '#src/modules/partners/domain/collaborator/invite-token.ts';
import * as InviteTokenId from '#src/modules/partners/domain/collaborator/invite-token-id.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';
import type {
  CollaboratorInviteTokenRepository,
  CollaboratorInviteTokenRepositoryError,
} from '#src/modules/partners/domain/collaborator/invite-token-repository.ts';
import type { CollaboratorInviteTokenMinter } from '../ports/collaborator-invite-token-minter.ts';
import type {
  CollaboratorInviteMailer,
  CollaboratorInviteMailerError,
} from '../ports/collaborator-invite-mailer.ts';

const DAY_MS = 86_400_000;

export type IssueCollaboratorInviteCommand = Readonly<{
  collaboratorId: CollaboratorId;
  email: string;
  recipientName: string;
}>;

export type IssueCollaboratorInviteError =
  | InviteToken.CollaboratorInviteTokenError
  | CollaboratorInviteTokenRepositoryError
  | CollaboratorInviteMailerError;

type Deps = Readonly<{
  inviteRepo: CollaboratorInviteTokenRepository;
  minter: CollaboratorInviteTokenMinter;
  mailer: CollaboratorInviteMailer;
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

    const saved = await deps.inviteRepo.save(token.value);
    if (!saved.ok) return saved;

    const url = new URL(deps.autocadastroBaseUrl);
    url.searchParams.set('token', secret.token);
    const sent = await deps.mailer.sendInvite({
      email: cmd.email,
      autocadastroUrl: url.toString(),
      recipientName: cmd.recipientName,
    });
    if (!sent.ok) return sent;

    return ok(undefined);
  };
