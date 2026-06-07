/**
 * Adapter de InviteMailer via EmailSender do modulo notifications (spec 005 US3, ADR-0006/0010).
 * Design: nodemailer-email-expert.
 *
 * Consome APENAS notifications/public-api (cross-modulo, ADR-0006). Template de boas-vindas/primeiro
 * acesso (distinto do reset — ISP). O `activationUrl` ja vem pronto do use case (origem confiavel);
 * NAO logar o link nem o corpo (token de uso unico). `recipientName` escapado no HTML (anti-XSS).
 * ASCII puro no codigo; o corpo e re-encodado UTF-8 pelo Nodemailer.
 */

import { ok, err } from '../../../../shared/primitives/result.ts';
import {
  parseEmailAddress,
  parseEmailSubject,
  type EmailAddress,
  type EmailSender,
} from '#src/modules/notifications/public-api/index.ts';
import type { InviteMailer } from '../../application/ports/invite-mailer.ts';

const escapeHtml = (raw: string): string =>
  raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const makeEmailInviteMailer = (
  deps: Readonly<{ emailSender: EmailSender; from: EmailAddress }>,
): InviteMailer => ({
  sendInvite: async ({ email, activationUrl, recipientName }) => {
    const to = parseEmailAddress(email);
    if (!to.ok) return err('invite-mail-failed');
    const subject = parseEmailSubject('Bem-vindo ao Bem Comum - ative seu acesso');
    if (!subject.ok) return err('invite-mail-failed');

    const textBody =
      `Ola, ${recipientName}!\n\n` +
      'Uma conta foi criada para voce no sistema Bem Comum.\n\n' +
      'Para definir sua senha e ativar o acesso, clique no link abaixo ' +
      '(valido por tempo limitado):\n\n' +
      `${activationUrl}\n\n` +
      'Se voce nao esperava este convite, ignore este e-mail. ' +
      'Nenhuma acao e necessaria - a conta permanecera inativa.';

    const safeName = escapeHtml(recipientName);
    const htmlBody =
      `<p>Ola, ${safeName}!</p>` +
      '<p>Uma conta foi criada para voce no sistema <strong>Bem Comum</strong>.</p>' +
      '<p>Para definir sua senha e ativar o acesso, clique no link abaixo ' +
      '(valido por tempo limitado):</p>' +
      `<p><a href="${activationUrl}">Ativar minha conta</a></p>` +
      '<p>Se voce nao esperava este convite, ignore este e-mail.</p>';

    const sent = await deps.emailSender.send({
      from: deps.from,
      to: [to.value],
      subject: subject.value,
      textBody,
      htmlBody,
    });
    return sent.ok ? ok(undefined) : err('invite-mail-failed');
  },
});
