/**
 * Port `CollaboratorInviteMailer` (US5) — envia o convite de autocadastro ao colaborador.
 *
 * PRÓPRIO do partners (não importa o `InviteMailer` do `auth` — ISP + isolamento de módulo,
 * ADR-0006): o template é de autocadastro de colaborador, não de ativação de usuário. O
 * `autocadastroUrl` já vem pronto do use case, construído de origem confiável (config do
 * servidor, NUNCA header `Host` — anti Host-Header-Injection). ASCII puro.
 */

import type { Result } from '#src/shared/primitives/result.ts';

export type CollaboratorInviteMailerError = 'invite-mail-failed';

export type CollaboratorInviteMailer = Readonly<{
  sendInvite: (
    input: Readonly<{ email: string; autocadastroUrl: string; recipientName: string }>,
  ) => Promise<Result<void, CollaboratorInviteMailerError>>;
}>;
