/**
 * Adapter de PasswordResetMailer via EmailSender do modulo notifications (BE-REC-003, ADR-0006/0010).
 *
 * Consome APENAS `notifications/public-api` (cross-modulo). Monta a EmailMessage (from de config,
 * subject + corpo com o link) e traduz qualquer falha para `reset-mail-failed`. O `resetUrl` ja vem
 * pronto do use case (origem confiavel). ASCII puro.
 */

import { ok, err } from '../../../../shared/primitives/result.ts';
import {
  parseEmailAddress,
  parseEmailSubject,
  type EmailAddress,
  type EmailSender,
} from '#src/modules/notifications/public-api/index.ts';
import type { PasswordResetMailer } from '../../application/ports/password-reset-mailer.ts';

export const makeEmailPasswordResetMailer = (
  deps: Readonly<{ emailSender: EmailSender; from: EmailAddress }>,
): PasswordResetMailer => ({
  sendResetLink: async ({ email, resetUrl }) => {
    const to = parseEmailAddress(email);
    if (!to.ok) return err('reset-mail-failed');
    const subject = parseEmailSubject('Recuperacao de senha');
    if (!subject.ok) return err('reset-mail-failed');

    const sent = await deps.emailSender.send({
      from: deps.from,
      to: [to.value],
      subject: subject.value,
      textBody:
        'Recebemos um pedido de redefinicao de senha. Acesse o link para continuar ' +
        `(expira em breve):\n\n${resetUrl}\n\nSe voce nao solicitou, ignore este e-mail.`,
    });
    return sent.ok ? ok(undefined) : err('reset-mail-failed');
  },
});
