/**
 * Adapter de `CollaboratorInviteMailer` via `EmailSender` do módulo notifications (US5,
 * ADR-0006/0010). PRÓPRIO do partners (não importa o invite-mailer do auth — ISP).
 *
 * Consome APENAS `notifications/public-api` (cross-módulo, ADR-0006). Template de autocadastro
 * de colaborador. O `autocadastroUrl` já vem pronto do use case (origem confiável); NÃO logar o
 * link nem o corpo (token de uso-único). `recipientName` escapado no HTML (anti-XSS). ASCII puro.
 */

import { ok, err } from '#src/shared/primitives/result.ts';
import {
  parseEmailAddress,
  parseEmailSubject,
  type EmailAddress,
  type EmailSender,
} from '#src/modules/notifications/public-api/index.ts';
import type { CollaboratorInviteMailer } from '../../application/ports/collaborator-invite-mailer.ts';

const escapeHtml = (raw: string): string =>
  raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const makeEmailCollaboratorInviteMailer = (
  deps: Readonly<{ emailSender: EmailSender; from: EmailAddress }>,
): CollaboratorInviteMailer => ({
  sendInvite: async ({ email, autocadastroUrl, recipientName }) => {
    const to = parseEmailAddress(email);
    if (!to.ok) return err('invite-mail-failed');
    const subject = parseEmailSubject('Bem Comum - complete seu cadastro de colaborador');
    if (!subject.ok) return err('invite-mail-failed');

    const textBody =
      `Ola, ${recipientName}!\n\n` +
      'Voce foi pre-cadastrado como colaborador no sistema Bem Comum.\n\n' +
      'Para completar seu cadastro, clique no link abaixo (valido por tempo limitado):\n\n' +
      `${autocadastroUrl}\n\n` +
      'Se voce nao esperava este convite, ignore este e-mail.';

    const safeName = escapeHtml(recipientName);
    const htmlBody =
      `<p>Ola, ${safeName}!</p>` +
      '<p>Voce foi pre-cadastrado como colaborador no sistema <strong>Bem Comum</strong>.</p>' +
      '<p>Para completar seu cadastro, clique no link abaixo (valido por tempo limitado):</p>' +
      `<p><a href="${autocadastroUrl}">Completar meu cadastro</a></p>` +
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
