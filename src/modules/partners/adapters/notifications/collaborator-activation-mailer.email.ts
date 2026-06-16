/**
 * Adapter de CollaboratorActivationMailer via EmailSender do módulo notifications (#43, ADR-0006/0010).
 *
 * Consome APENAS `notifications/public-api` (cross-módulo — NUNCA importa do auth). Monta a
 * EmailMessage (from de config, subject + corpo com o link) e traduz qualquer falha para
 * `activation-mail-failed`. O `activationUrl` já vem pronto do use case (origem confiável). ASCII puro.
 */

import { ok, err } from '#src/shared/primitives/result.ts';
import {
  parseEmailAddress,
  parseEmailSubject,
  type EmailAddress,
  type EmailSender,
} from '#src/modules/notifications/public-api/index.ts';
import type { CollaboratorActivationMailer } from '#src/modules/partners/application/ports/collaborator-activation-mailer.ts';

export const makeEmailCollaboratorActivationMailer = (
  deps: Readonly<{ emailSender: EmailSender; from: EmailAddress }>,
): CollaboratorActivationMailer => ({
  sendActivationLink: async ({ email, activationUrl, recipientName }) => {
    const to = parseEmailAddress(email);
    if (!to.ok) return err('activation-mail-failed');
    const subject = parseEmailSubject('Conclua seu cadastro');
    if (!subject.ok) return err('activation-mail-failed');

    const greeting = recipientName.trim().length > 0 ? `Ola, ${recipientName}.\n\n` : '';
    const sent = await deps.emailSender.send({
      from: deps.from,
      to: [to.value],
      subject: subject.value,
      textBody:
        `${greeting}Para concluir seu cadastro de colaborador, acesse o link a seguir ` +
        `(expira em breve):\n\n${activationUrl}\n\nSe voce nao reconhece este convite, ignore este e-mail.`,
    });
    return sent.ok ? ok(undefined) : err('activation-mail-failed');
  },
});
