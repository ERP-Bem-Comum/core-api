/**
 * Adapter de PasswordResetMailer que ENFILEIRA o e-mail no EmailOutbox (NOTIF-EMAIL-OUTBOX).
 *
 * Substitui o envio síncrono (`password-reset-mailer.email.ts`) pela entrega assíncrona:
 * o use case continua chamando `mailer.sendResetLink`, mas agora a intenção de envio é
 * gravada no outbox e o worker (`notifications/worker`) faz o envio real com retry/backoff.
 *
 * Anti-enumeração preservada: este adapter só é chamado pelo use case quando a conta
 * existe e está ativa; e-mail malformado aqui → `reset-mail-failed` sem enfileirar nada.
 *
 * Consome APENAS `notifications/public-api` (cross-módulo, ADR-0006). ASCII puro.
 */

import { randomUUID } from 'node:crypto';

import { ok, err } from '#src/shared/primitives/result.ts';
import {
  parseEmailAddress,
  parseEmailSubject,
  type EmailAddress,
  type EmailOutbox,
} from '#src/modules/notifications/public-api/index.ts';
import type { PasswordResetMailer } from '../../application/ports/password-reset-mailer.ts';

// idempotencyKey deriva do token no link (único por pedido) → reenfileirar o mesmo
// pedido é no-op; pedidos distintos têm tokens distintos. Fallback: UUID aleatório.
const deriveKey = (resetUrl: string): string => {
  const idx = resetUrl.indexOf('token=');
  if (idx === -1) return `reset:${randomUUID()}`;
  return `reset:${resetUrl.slice(idx + 'token='.length)}`;
};

export const makeOutboxPasswordResetMailer = (
  deps: Readonly<{ emailOutbox: EmailOutbox; from: EmailAddress }>,
): PasswordResetMailer => ({
  sendResetLink: async ({ email, resetUrl }) => {
    const to = parseEmailAddress(email);
    if (!to.ok) return err('reset-mail-failed');
    const subject = parseEmailSubject('Recuperacao de senha');
    if (!subject.ok) return err('reset-mail-failed');

    const idempotencyKey = deriveKey(resetUrl);

    const enqueued = await deps.emailOutbox.enqueue(
      {
        from: deps.from,
        to: [to.value],
        subject: subject.value,
        textBody:
          'Recebemos um pedido de redefinicao de senha. Acesse o link para continuar ' +
          `(expira em breve):\n\n${resetUrl}\n\nSe voce nao solicitou, ignore este e-mail.`,
      },
      idempotencyKey,
    );

    // Duplicata (mesmo pedido já enfileirado) é sucesso do ponto de vista do fluxo.
    if (!enqueued.ok && enqueued.error.tag === 'EmailOutboxDuplicate') return ok(undefined);
    return enqueued.ok ? ok(undefined) : err('reset-mail-failed');
  },
});
