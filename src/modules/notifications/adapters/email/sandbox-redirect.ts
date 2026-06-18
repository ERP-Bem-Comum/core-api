/**
 * withSandboxRedirect - decorator de EmailSender (ADR-0010 "Decorators opcionais").
 *
 * Ticket: NOTIF-EMAIL-DEPLOY-CONFIG. Quando ha EMAIL_SANDBOX_TO, reescreve to/cc/bcc para a
 * caixa de sandbox antes de delegar ao sender subjacente. Preserva from/subject/corpo.
 *
 * Usar SO fora de prod (a fabrica buildEmailSender monta o decorator apenas quando ha sandboxTo).
 * ASCII puro.
 */

import type { EmailSender } from '../../application/ports/email-sender.ts';
import type { EmailAddress } from '../../domain/email/address.ts';

export const withSandboxRedirect = (sender: EmailSender, sandboxTo: EmailAddress): EmailSender => ({
  send: async (message) =>
    sender.send({
      ...message,
      to: [sandboxTo],
      ...(message.cc !== undefined ? { cc: [sandboxTo] } : {}),
      ...(message.bcc !== undefined ? { bcc: [sandboxTo] } : {}),
    }),
});
