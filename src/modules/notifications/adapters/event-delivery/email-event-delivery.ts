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

// ─── templates de e-mail transacional (layout de marca compartilhado, definido abaixo) ──────────

// ─── layout de marca compartilhado (HTML RESTRITO: tabelas + CSS inline — diretriz do tech lead) ──

// Logo hospedado no web-app (mesma origem do link do e-mail). E-mail nao embute imagem (base64 e
// bloqueado no Gmail) -> URL publica derivada do proprio link (zero config); URL malformada -> null
// (fallback textual). Asset: web-app public/images/logo-bem-comum-email.png.
const EMAIL_LOGO_PATH = '/images/logo-bem-comum-email.png';
const emailLogoUrl = (linkUrl: string): string | null => {
  try {
    return new URL(linkUrl).origin + EMAIL_LOGO_PATH;
  } catch {
    return null;
  }
};

const BRAND_BLUE = '#33609C';
const FONT_STACK = "'Nunito','Helvetica Neue',Helvetica,Arial,sans-serif";

// Paragrafo do corpo (estilo unico; o ultimo antes do botao ganha folga maior).
const bodyP = (innerHtml: string, last = false): string =>
  `<p style="margin:0 0 ${last ? '26' : '16'}px 0;font-size:15px;line-height:1.65;` +
  `color:#4B5563;">${innerHtml}</p>`;

// Realce de termo-chave no azul da marca (dentro do corpo).
const hl = (text: string): string => `<strong style="color:${BRAND_BLUE};">${text}</strong>`;

// Saudacao "Ola, <nome>!" (nome ja escapado). Nota de rodape dos CONVITES (colaborador/usuario).
const greetName = (safeName: string): string => `Ol&aacute;, ${safeName}!`;
const INVITE_FOOTNOTE =
  'Se voc&ecirc; n&atilde;o esperava este convite, pode ignorar este e-mail com seguran&ccedil;a.';

// Layout de marca compartilhado por todos os e-mails transacionais: faixa + logo, saudacao, corpo,
// botao CTA table-based (Outlook-safe), nota + rodape. `safeName`/`ctaUrl` ja escapados pelo chamador
// (anti-XSS); `bodyHtml` e conteudo CONFIAVEL (montado pelo template, acentos como entidades).
const brandedEmailHtml = (
  parts: Readonly<{
    logoUrl: string | null;
    greetingHtml: string;
    bodyHtml: string;
    ctaLabel: string;
    ctaUrl: string;
    footnoteHtml: string;
  }>,
): string => {
  const logoBlock =
    parts.logoUrl === null
      ? `<div style="font-family:${FONT_STACK};font-size:22px;font-weight:800;` +
        `color:${BRAND_BLUE};">Bem Comum</div>`
      : `<img src="${parts.logoUrl}" width="180" alt="Bem Comum" ` +
        'style="display:block;width:180px;max-width:180px;height:auto;border:0;" />';

  return (
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
    `color:#1E2A3A;">${parts.greetingHtml}</p>` +
    parts.bodyHtml +
    '</td></tr>' +
    '<tr><td align="center" style="padding:0 40px 30px 40px;">' +
    '<table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
    `<td align="center" style="border-radius:8px;background-color:${BRAND_BLUE};">` +
    `<a href="${parts.ctaUrl}" target="_blank" style="display:inline-block;padding:14px 30px;` +
    `font-family:${FONT_STACK};font-size:15px;font-weight:700;color:#FFFFFF;` +
    `text-decoration:none;border-radius:8px;">${parts.ctaLabel}</a>` +
    '</td></tr></table></td></tr>' +
    `<tr><td style="padding:0 40px 28px 40px;font-family:${FONT_STACK};">` +
    '<div style="height:1px;line-height:1px;font-size:0;background-color:#EDF1F4;' +
    'margin-bottom:18px;">&nbsp;</div>' +
    '<p style="margin:0;font-size:13px;line-height:1.6;color:#9AA4B0;">' +
    `${parts.footnoteHtml}</p></td></tr></table>` +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" ' +
    'style="width:600px;max-width:600px;"><tr>' +
    `<td align="center" style="padding:18px 40px 6px 40px;font-family:${FONT_STACK};">` +
    '<p style="margin:0;font-size:12px;line-height:1.5;color:#A7B0BC;">' +
    'Bem Comum &middot; este &eacute; um e-mail autom&aacute;tico, n&atilde;o responda.' +
    '</p></td></tr></table></td></tr></table>'
  );
};

// UserInvited — conta criada; define a senha do 1o acesso. Novo layout de marca + copy do modelo
// antigo ("Bem-vindo ao ERP! ... criar uma senha para o primeiro acesso").
const inviteTemplate = (
  event: Readonly<{ activationUrl: string; recipientName: string }>,
): Readonly<{ subject: string; textBody: string; htmlBody: string }> => {
  const textBody =
    `Ola, ${event.recipientName}!\n\n` +
    'Seja bem-vindo ao ERP Bem Comum! Agora falta pouco para voce ter acesso a plataforma.\n\n' +
    'Basta clicar no link abaixo e criar uma senha para o seu primeiro acesso ' +
    '(valido por tempo limitado):\n\n' +
    `${event.activationUrl}\n\n` +
    'Se voce nao esperava este convite, ignore este e-mail.';

  const htmlBody = brandedEmailHtml({
    logoUrl: emailLogoUrl(event.activationUrl),
    greetingHtml: greetName(escapeHtml(event.recipientName)),
    bodyHtml:
      bodyP(
        `Seja bem-vindo ao ERP ${hl('Bem Comum')}! Agora falta pouco para voc&ecirc; ` +
        'ter acesso &agrave; plataforma.',
      ) +
      bodyP(
        'Basta clicar no bot&atilde;o abaixo e criar uma senha para o seu primeiro acesso ' +
        '(v&aacute;lido por tempo limitado):',
        true,
      ),
    ctaLabel: 'Criar senha',
    ctaUrl: escapeHtml(event.activationUrl),
    footnoteHtml: INVITE_FOOTNOTE,
  });

  return { subject: 'Bem Comum - Seja Bem-vindo ao ERP!', textBody, htmlBody };
};

// CollaboratorInvited (partners) — convite de autocadastro de colaborador (mesmo layout de marca).
const collaboratorInviteTemplate = (
  event: Readonly<{ autocadastroUrl: string; recipientName: string }>,
): Readonly<{ subject: string; textBody: string; htmlBody: string }> => {
  const textBody =
    `Ola, ${event.recipientName}!\n\n` +
    'Voce foi convidado a completar seu cadastro de Colaborador no sistema Bem Comum.\n\n' +
    'Para preencher seus dados, clique no link abaixo (valido por tempo limitado):\n\n' +
    `${event.autocadastroUrl}\n\n` +
    'Se voce nao esperava este convite, ignore este e-mail.';

  const htmlBody = brandedEmailHtml({
    logoUrl: emailLogoUrl(event.autocadastroUrl),
    greetingHtml: greetName(escapeHtml(event.recipientName)),
    bodyHtml:
      bodyP(
        `Voc&ecirc; foi convidado a completar seu cadastro de ${hl('Colaborador')} ` +
        'no sistema Bem Comum.',
      ) +
      bodyP(
        'Para preencher seus dados, clique no bot&atilde;o abaixo (v&aacute;lido por tempo limitado):',
        true,
      ),
    ctaLabel: 'Completar meu cadastro',
    ctaUrl: escapeHtml(event.autocadastroUrl),
    footnoteHtml: INVITE_FOOTNOTE,
  });

  return { subject: 'Bem Comum - Complete seu Cadastro de Colaborador', textBody, htmlBody };
};

// PasswordResetRequested — pedido de recuperacao de senha (mesmo layout de marca). O evento NAO carrega
// nome -> saudacao sem nome; a nota e "nao solicitou" (nao "nao esperava convite").
const resetTemplate = (
  event: Readonly<{ resetUrl: string }>,
): Readonly<{ subject: string; textBody: string; htmlBody: string }> => {
  const textBody =
    'Ola,\n\n' +
    'Recebemos um pedido para redefinir a sua senha de acesso ao ERP Bem Comum.\n\n' +
    'Para criar uma nova senha, clique no link abaixo (valido por tempo limitado):\n\n' +
    `${event.resetUrl}\n\n` +
    'Se voce nao solicitou esta redefinicao, ignore este e-mail - sua senha atual continua valida.';

  const htmlBody = brandedEmailHtml({
    logoUrl: emailLogoUrl(event.resetUrl),
    greetingHtml: 'Ol&aacute;,',
    bodyHtml:
      bodyP(
        `Recebemos um pedido para redefinir a sua senha de acesso ao ERP ${hl('Bem Comum')}.`,
      ) +
      bodyP(
        'Para criar uma nova senha, clique no bot&atilde;o abaixo (v&aacute;lido por tempo limitado):',
        true,
      ),
    ctaLabel: 'Redefinir senha',
    ctaUrl: escapeHtml(event.resetUrl),
    footnoteHtml:
      'Se voc&ecirc; n&atilde;o solicitou esta redefini&ccedil;&atilde;o, pode ignorar este e-mail ' +
      '&mdash; sua senha atual continua v&aacute;lida.',
  });

  return { subject: 'Bem Comum - Recuperar Senha', textBody, htmlBody };
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
      return ok({
        from,
        to: [to.value],
        subject: subject.value,
        textBody: tpl.textBody,
        htmlBody: tpl.htmlBody,
      });
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
