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

// Logo hospedado no web-app (mesma origem do link de autocadastro). E-mail nao embute imagem
// (base64 e bloqueado no Gmail) -> URL publica. Deriva do proprio autocadastroUrl (zero config nova);
// URL malformada -> null (fallback textual). Path do asset: web-app public/images/.
const EMAIL_LOGO_PATH = '/images/logo-bem-comum-email.png';
const emailLogoUrl = (autocadastroUrl: string): string | null => {
  try {
    return new URL(autocadastroUrl).origin + EMAIL_LOGO_PATH;
  } catch {
    return null;
  }
};

const BRAND_BLUE = '#33609C';
const FONT_STACK = "'Nunito','Helvetica Neue',Helvetica,Arial,sans-serif";

// CollaboratorInvited (partners) — convite de autocadastro de colaborador. HTML de marca RESTRITO
// (tabelas + CSS inline; diretriz do tech lead), acentos como entidades (a prova de cliente), nome
// escapado (anti-XSS). Espelha o invite-mailer do partners (collaborator-invite-mailer.email.ts).
const collaboratorInviteTemplate = (
  event: Readonly<{ autocadastroUrl: string; recipientName: string }>,
): Readonly<{ subject: string; textBody: string; htmlBody: string }> => {
  const textBody =
    `Ola, ${event.recipientName}!\n\n` +
    'Voce foi convidado a completar seu cadastro de Colaborador no sistema Bem Comum.\n\n' +
    'Para preencher seus dados, clique no link abaixo (valido por tempo limitado):\n\n' +
    `${event.autocadastroUrl}\n\n` +
    'Se voce nao esperava este convite, ignore este e-mail.';

  const safeName = escapeHtml(event.recipientName);
  const safeUrl = escapeHtml(event.autocadastroUrl);
  const logoUrl = emailLogoUrl(event.autocadastroUrl);
  const logoBlock =
    logoUrl === null
      ? `<div style="font-family:${FONT_STACK};font-size:22px;font-weight:800;` +
        `color:${BRAND_BLUE};">Bem Comum</div>`
      : `<img src="${logoUrl}" width="180" alt="Bem Comum" ` +
        'style="display:block;width:180px;max-width:180px;height:auto;border:0;" />';

  const htmlBody =
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ' +
    'style="margin:0;padding:0;background-color:#E8EEF0;"><tr>' +
    '<td align="center" style="padding:32px 16px;">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" ' +
    'style="width:600px;max-width:600px;background-color:#FFFFFF;border:1px solid #E3E9EE;' +
    'border-radius:14px;overflow:hidden;">' +
    `<tr><td style="height:5px;line-height:5px;font-size:0;background-color:${BRAND_BLUE};">` +
    '&nbsp;</td></tr>' +
    `<tr><td align="center" style="padding:34px 40px 22px 40px;">${logoBlock}</td></tr>` +
    '<tr><td style="padding:0 40px;"><div style="height:1px;line-height:1px;font-size:0;' +
    'background-color:#EDF1F4;">&nbsp;</div></td></tr>' +
    `<tr><td style="padding:30px 40px 8px 40px;font-family:${FONT_STACK};">` +
    '<p style="margin:0 0 18px 0;font-size:19px;line-height:1.4;font-weight:700;' +
    `color:#1E2A3A;">Ol&aacute;, ${safeName}!</p>` +
    '<p style="margin:0 0 16px 0;font-size:15px;line-height:1.65;color:#4B5563;">' +
    'Voc&ecirc; foi convidado a completar seu cadastro de ' +
    `<strong style="color:${BRAND_BLUE};">Colaborador</strong> no sistema Bem Comum.</p>` +
    '<p style="margin:0 0 26px 0;font-size:15px;line-height:1.65;color:#4B5563;">' +
    'Para preencher seus dados, clique no bot&atilde;o abaixo ' +
    '(v&aacute;lido por tempo limitado):</p></td></tr>' +
    '<tr><td align="center" style="padding:0 40px 30px 40px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
    `<td align="center" style="border-radius:8px;background-color:${BRAND_BLUE};">` +
    `<a href="${safeUrl}" target="_blank" style="display:inline-block;padding:14px 30px;` +
    `font-family:${FONT_STACK};font-size:15px;font-weight:700;color:#FFFFFF;` +
    'text-decoration:none;border-radius:8px;">Completar meu cadastro</a>' +
    '</td></tr></table></td></tr>' +
    `<tr><td style="padding:0 40px 28px 40px;font-family:${FONT_STACK};">` +
    '<div style="height:1px;line-height:1px;font-size:0;background-color:#EDF1F4;' +
    'margin-bottom:18px;">&nbsp;</div>' +
    '<p style="margin:0;font-size:13px;line-height:1.6;color:#9AA4B0;">' +
    'Se voc&ecirc; n&atilde;o esperava este convite, pode ignorar este e-mail ' +
    'com seguran&ccedil;a.</p></td></tr></table>' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" ' +
    'style="width:600px;max-width:600px;"><tr>' +
    `<td align="center" style="padding:18px 40px 6px 40px;font-family:${FONT_STACK};">` +
    '<p style="margin:0;font-size:12px;line-height:1.5;color:#A7B0BC;">' +
    'Bem Comum &middot; este &eacute; um e-mail autom&aacute;tico, n&atilde;o responda.' +
    '</p></td></tr></table></td></tr></table>';

  return {
    subject: 'Bem Comum - Complete seu Cadastro de Colaborador',
    textBody,
    htmlBody,
  };
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
