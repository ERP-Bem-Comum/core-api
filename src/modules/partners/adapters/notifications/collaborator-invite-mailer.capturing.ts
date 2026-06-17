/**
 * Fake capturing de `CollaboratorInviteMailer` (US5) — driver memory/test. Não envia: registra
 * o que seria enviado e extrai o token do `autocadastroUrl` (o token claro só "existe" no link).
 * Permite os testes dirigirem o fluxo público a partir do convite, espelhando o e2e real de
 * clicar no link. ASCII puro.
 */

import { ok } from '#src/shared/primitives/result.ts';
import type { CollaboratorInviteMailer } from '#src/modules/partners/application/ports/collaborator-invite-mailer.ts';

export type CapturedCollaboratorInvite = Readonly<{
  to: string;
  recipientName: string;
  autocadastroUrl: string;
  token: string;
}>;

export type CapturingCollaboratorInviteMailer = Readonly<{
  mailer: CollaboratorInviteMailer;
  sent: readonly CapturedCollaboratorInvite[];
}>;

export const makeCapturingCollaboratorInviteMailer = (): CapturingCollaboratorInviteMailer => {
  const sent: CapturedCollaboratorInvite[] = [];

  const mailer: CollaboratorInviteMailer = {
    sendInvite: async ({ email, autocadastroUrl, recipientName }) => {
      const token = new URL(autocadastroUrl).searchParams.get('token') ?? '';
      sent.push({ to: email, recipientName, autocadastroUrl, token });
      return ok(undefined);
    },
  };

  return { mailer, sent };
};
