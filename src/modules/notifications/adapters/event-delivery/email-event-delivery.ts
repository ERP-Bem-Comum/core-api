// Consumidor de eventos de e-mail transacional (NOTIF-EMAIL-EVENT-CONSUMER / ADR-0047 fatia 02).
//
// `EventDelivery<OutboxRow>`: recebe a row lida do `auth_outbox`, decodifica via auth/public-api
// (ADR-0006 — cross-modulo so via public-api), mapeia eventType -> TEMPLATE (texto/HTML, migrados
// dos mailers atuais incl. escapeHtml — ADR-0010 §"templates na application layer") -> EmailMessage
// -> EmailSender.send. Falha de envio / payload corrupto -> DeliveryError; o worker generico
// (`#src/shared/outbox`) decide retry/DLQ pelos attempts (at-least-once — ADR-0015).
//
// SEGURANCA: o link/token vem pronto do produtor (origem confiavel); o nome do convite e escapado
// no HTML (anti-XSS). NAO logar o link nem o corpo.
//
// ADR-0006 (Result na borda), ADR-0010 (Email Port/Adapter), ADR-0047 (consumidor do evento).

import process from 'node:process';

import { ok, err } from '#src/shared/primitives/result.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import type { EventDelivery, DeliveryError, OutboxRow } from '#src/shared/outbox/index.ts';
import { deliveryUnavailable } from '#src/shared/outbox/index.ts';
import {
  decodeAuthEmailEventV1,
  type AuthEmailEvent,
} from '#src/modules/auth/public-api/email-events.ts';
import {
  decodePartnersEmailEventV1,
  type PartnersEmailEvent,
} from '#src/modules/partners/public-api/email-events.ts';
import { parseEmailSubject, parseEmailAddress } from '../../public-api/index.ts';
import type { EmailAddress } from '../../domain/email/address.ts';
import type { EmailMessage } from '../../domain/email/types.ts';
import type { EmailSender } from '../../application/ports/email-sender.ts';

const CONSUMER_ID = 'notifications-email-dispatch';

const escapeHtml = (raw: string): string =>
  raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ─── templates (migrados dos mailers atuais — CA8) ──────────────────────────────

// PasswordResetRequested — espelha password-reset-mailer.email.ts.
const resetTemplate = (
  event: Readonly<{ resetUrl: string }>,
): Readonly<{ subject: string; textBody: string }> => ({
  subject: 'Recuperacao de senha',
  textBody:
    'Recebemos um pedido de redefinicao de senha. Acesse o link para continuar ' +
    `(expira em breve):\n\n${event.resetUrl}\n\nSe voce nao solicitou, ignore este e-mail.`,
});

// UserInvited — espelha invite-mailer.email.ts (texto + HTML com escapeHtml no nome).
const inviteTemplate = (
  event: Readonly<{ activationUrl: string; recipientName: string }>,
): Readonly<{ subject: string; textBody: string; htmlBody: string }> => {
  const textBody =
    `Ola, ${event.recipientName}!\n\n` +
    'Uma conta foi criada para voce no sistema Bem Comum.\n\n' +
    'Para definir sua senha e ativar o acesso, clique no link abaixo ' +
    '(valido por tempo limitado):\n\n' +
    `${event.activationUrl}\n\n` +
    'Se voce nao esperava este convite, ignore este e-mail. ' +
    'Nenhuma acao e necessaria - a conta permanecera inativa.';

  const safeName = escapeHtml(event.recipientName);
  const htmlBody =
    `<p>Ola, ${safeName}!</p>` +
    '<p>Uma conta foi criada para voce no sistema <strong>Bem Comum</strong>.</p>' +
    '<p>Para definir sua senha e ativar o acesso, clique no link abaixo ' +
    '(valido por tempo limitado):</p>' +
    `<p><a href="${event.activationUrl}">Ativar minha conta</a></p>` +
    '<p>Se voce nao esperava este convite, ignore este e-mail.</p>';

  return { subject: 'Bem-vindo ao Bem Comum - ative seu acesso', textBody, htmlBody };
};

// CollaboratorInvited (partners) — convite de autocadastro de colaborador (texto + HTML com
// escapeHtml no nome). Espelha o invite-mailer do partners (collaborator-invite-mailer.email.ts).
const collaboratorInviteTemplate = (
  event: Readonly<{ autocadastroUrl: string; recipientName: string }>,
): Readonly<{ subject: string; textBody: string; htmlBody: string }> => {
  const textBody =
    `Ola, ${event.recipientName}!\n\n` +
    'Voce foi convidado a completar seu cadastro de colaborador no sistema Bem Comum.\n\n' +
    'Para preencher seus dados e ativar o acesso, clique no link abaixo ' +
    '(valido por tempo limitado):\n\n' +
    `${event.autocadastroUrl}\n\n` +
    'Se voce nao esperava este convite, ignore este e-mail.';

  const safeName = escapeHtml(event.recipientName);
  const htmlBody =
    `<p>Ola, ${safeName}!</p>` +
    '<p>Voce foi convidado a completar seu cadastro de colaborador no sistema ' +
    '<strong>Bem Comum</strong>.</p>' +
    '<p>Para preencher seus dados e ativar o acesso, clique no link abaixo ' +
    '(valido por tempo limitado):</p>' +
    `<p><a href="${event.autocadastroUrl}">Completar meu cadastro</a></p>` +
    '<p>Se voce nao esperava este convite, ignore este e-mail.</p>';

  return { subject: 'Bem Comum - complete seu cadastro de colaborador', textBody, htmlBody };
};

// ─── union multi-fonte (auth + partners) ──────────────────────────────────────

/** Evento de e-mail transacional de qualquer modulo produtor (decodificado via public-api). */
type EmailEvent = AuthEmailEvent | PartnersEmailEvent;

// ─── event -> EmailMessage ──────────────────────────────────────────────────────

// Reusa o smart constructor de EmailAddress do proprio modulo (public-api).
const parseEmailRecipient = (raw: string): Result<EmailAddress, DeliveryError> => {
  const parsed = parseEmailAddress(raw);
  if (!parsed.ok) return err(deliveryUnavailable(`invalid-recipient:${parsed.error}`));
  return ok(parsed.value);
};

const buildMessage = (
  event: EmailEvent,
  from: EmailAddress,
): Result<EmailMessage, DeliveryError> => {
  const to = parseEmailRecipient(event.email);
  if (!to.ok) return to;

  switch (event.type) {
    case 'PasswordResetRequested': {
      const tpl = resetTemplate(event);
      const subject = parseEmailSubject(tpl.subject);
      if (!subject.ok) {
        return err(deliveryUnavailable(`invalid-subject:${subject.error}`));
      }
      return ok({ from, to: [to.value], subject: subject.value, textBody: tpl.textBody });
    }
    case 'UserInvited': {
      const tpl = inviteTemplate(event);
      const subject = parseEmailSubject(tpl.subject);
      if (!subject.ok) {
        return err(deliveryUnavailable(`invalid-subject:${subject.error}`));
      }
      return ok({
        from,
        to: [to.value],
        subject: subject.value,
        textBody: tpl.textBody,
        htmlBody: tpl.htmlBody,
      });
    }
    case 'CollaboratorInvited': {
      const tpl = collaboratorInviteTemplate(event);
      const subject = parseEmailSubject(tpl.subject);
      if (!subject.ok) {
        return err(deliveryUnavailable(`invalid-subject:${subject.error}`));
      }
      return ok({
        from,
        to: [to.value],
        subject: subject.value,
        textBody: tpl.textBody,
        htmlBody: tpl.htmlBody,
      });
    }
    default: {
      // exhaustive — nenhum outro caso possivel nos contratos v1 (auth + partners).
      const _exhaustive: never = event;
      void _exhaustive;
      return err(deliveryUnavailable('unreachable-event-type'));
    }
  }
};

// ─── decode multi-fonte ─────────────────────────────────────────────────────────
//
// O worker email-dispatch le auth_outbox + par_email_outbox e entrega ambas as rows a ESTA mesma
// delivery. O eventType da row seleciona o decoder do modulo produtor correto (ambos via
// public-api — ADR-0006). UnknownEventType de um decoder NAO e um envelope corrompido se o outro
// reconhece o tipo; por isso roteamos por eventType antes de decodificar.
const PARTNERS_EVENT_TYPES = new Set<string>(['CollaboratorInvited']);

const decodeEmailEvent = (row: OutboxRow): Result<EmailEvent, DeliveryError> => {
  const decoded = PARTNERS_EVENT_TYPES.has(row.eventType)
    ? decodePartnersEmailEventV1(row)
    : decodeAuthEmailEventV1(row);
  if (!decoded.ok) return err(deliveryUnavailable(`decode-failed:${decoded.error.tag}`));
  return ok(decoded.value);
};

// ─── EmailEventDelivery ───────────────────────────────────────────────────────

/**
 * createEmailEventDelivery — EventDelivery<OutboxRow> do consumidor de e-mail.
 *
 * Decodifica a row (auth/public-api), monta a EmailMessage do template e envia via EmailSender.
 * Erro de decode (payload corrupto / eventType desconhecido / versao) -> err -> worker -> DLQ.
 * Erro de envio (EmailError) -> err -> worker -> retry/DLQ pelos attempts.
 */
export const createEmailEventDelivery = (
  deps: Readonly<{ emailSender: EmailSender; from: EmailAddress }>,
): EventDelivery<OutboxRow> => ({
  consumerId: CONSUMER_ID,
  deliver: async (row): Promise<Result<void, DeliveryError>> => {
    const decoded = decodeEmailEvent(row);
    if (!decoded.ok) return decoded;

    const message = buildMessage(decoded.value, deps.from);
    if (!message.ok) return message;

    const sent = await deps.emailSender.send(message.value);
    if (sent.ok) return ok(undefined);
    // rate-limited (#133): descarte anti-flood — a row e PROCESSADA (nao retry, nao DLQ). O e-mail
    // excedente e intencionalmente suprimido; nao ha o que reentregar (a janela precisa passar).
    // M4: sinal observavel do descarte (sem endereco — anti-vazamento), distinto do "delivered" do worker.
    if (sent.error.tag === 'rate-limited') {
      process.stderr.write(
        `[email-event-delivery] rate-limited: e-mail suprimido eventId=${row.eventId} type=${row.eventType}\n`,
      );
      return ok(undefined);
    }
    return err(deliveryUnavailable(`email-send-failed:${sent.error.tag}:${sent.error.reason}`));
  },
});
