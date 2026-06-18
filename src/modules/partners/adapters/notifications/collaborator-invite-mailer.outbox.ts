/**
 * Adapter de `CollaboratorInviteMailer` que ENFILEIRA o e-mail no EmailOutbox (NOTIF-INVITE-OUTBOX).
 *
 * Substitui o envio sincrono (`collaborator-invite-mailer.email.ts`) pela entrega assincrona: o use
 * case continua chamando `mailer.sendInvite`, mas a intencao de envio e gravada no outbox e o worker
 * (`notifications/worker`) faz o envio real com retry/backoff. PROPRIO do partners (nao importa o
 * invite-mailer do auth — ISP).
 *
 * Template preservado (subject/texto/HTML identicos ao adapter sincrono), incluindo `escapeHtml`
 * (anti-XSS) no `recipientName`. NAO logar o link nem o corpo (token de uso unico).
 *
 * Consome APENAS `notifications/public-api` (cross-modulo, ADR-0006). ASCII puro.
 */

import { randomUUID } from 'node:crypto';

import { ok, err } from '#src/shared/primitives/result.ts';
import {
  parseEmailAddress,
  parseEmailSubject,
  type EmailAddress,
  type EmailOutbox,
} from '#src/modules/notifications/public-api/index.ts';
import type { CollaboratorInviteMailer } from '../../application/ports/collaborator-invite-mailer.ts';

const escapeHtml = (raw: string): string =>
  raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// idempotencyKey deriva do token no link (unico por convite) -> reenfileirar o mesmo convite e
// no-op; convites distintos tem tokens distintos. Fallback: UUID aleatorio.
const deriveKey = (autocadastroUrl: string): string => {
  const idx = autocadastroUrl.indexOf('token=');
  if (idx === -1) return `collab-invite:${randomUUID()}`;
  return `collab-invite:${autocadastroUrl.slice(idx + 'token='.length)}`;
};

export const makeOutboxCollaboratorInviteMailer = (
  deps: Readonly<{ emailOutbox: EmailOutbox; from: EmailAddress }>,
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

    const idempotencyKey = deriveKey(autocadastroUrl);

    const enqueued = await deps.emailOutbox.enqueue(
      {
        from: deps.from,
        to: [to.value],
        subject: subject.value,
        textBody,
        htmlBody,
      },
      idempotencyKey,
    );

    // Duplicata (mesmo convite ja enfileirado) e sucesso do ponto de vista do fluxo.
    if (!enqueued.ok && enqueued.error.tag === 'EmailOutboxDuplicate') return ok(undefined);
    return enqueued.ok ? ok(undefined) : err('invite-mail-failed');
  },
});
