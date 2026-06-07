/**
 * Port InviteMailer (modulo auth, spec 005 FR-016) - envia o convite de ativacao ao novo usuario.
 *
 * Separado do PasswordResetMailer (ISP): o convite de primeiro acesso usa um template de
 * boas-vindas, nao de "redefinir senha". A mecanica subjacente (token de uso unico + link) e a
 * mesma, mas a UX difere. O `activationUrl` ja vem pronto do use case, construido de origem
 * confiavel (config do servidor, NUNCA header Host - anti Host-Header-Injection). ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';

export type InviteMailerError = 'invite-mail-failed';

export type InviteMailer = Readonly<{
  sendInvite: (
    input: Readonly<{ email: string; activationUrl: string; recipientName: string }>,
  ) => Promise<Result<void, InviteMailerError>>;
}>;
