/**
 * createNodemailerEmailSender - adapter de producao para EmailSender via Nodemailer.
 *
 * Ticket: CTR-EMAIL-ADAPTER-NODEMAILER (W1).
 *
 * Estrategia:
 *   - Recebe SmtpConfig (parseado via parseSmtpConfig) - sem env interna.
 *   - Cria Transporter com pool (default ADR-0010).
 *   - sendMail() encapsulado em try/catch que retorna Result.
 *   - Heuristica mapNodemailerError classifica erro cru em EmailError tagged.
 *
 * ASCII puro.
 */

import nodemailer from 'nodemailer';
import type SMTPPool from 'nodemailer/lib/smtp-pool/index.js';
import type SMTPTransport from 'nodemailer/lib/smtp-transport/index.js';

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { EmailSender } from '../../application/ports/email-sender.ts';
import type { EmailError, EmailMessage, EmailReceipt } from '../../domain/email/types.ts';
import type { SmtpConfig } from './nodemailer-config.ts';

/**
 * mapNodemailerError - heuristica regex sobre mensagens do Nodemailer.
 *
 * Buckets:
 *   - invalid-recipient: EENVELOPE, "invalid recipient", "no recipients"
 *   - smtp-rejected:     EAUTH, codigos 5xx (550, 554)
 *   - transport-failed:  catch-all (rede, DNS, timeout, etc.)
 *
 * Heuristica fragil - tests CA-T8/T9 validam contra erros reais do Ethereal.
 */
const mapNodemailerError = (caught: unknown): EmailError => {
  if (!(caught instanceof Error)) {
    return { tag: 'transport-failed', reason: 'unknown non-Error throw' };
  }
  const msg = caught.message;
  if (/EENVELOPE|invalid recipient|no recipients/i.test(msg)) {
    return { tag: 'invalid-recipient', reason: msg };
  }
  if (/EAUTH|\b5(50|54)\b/.test(msg)) {
    return { tag: 'smtp-rejected', reason: msg };
  }
  return { tag: 'transport-failed', reason: msg };
};

export const createNodemailerEmailSender = (config: SmtpConfig): EmailSender => {
  const baseOpts: SMTPTransport.Options = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: config.requireTLS,
    auth: { user: config.user, pass: config.pass },
  };
  const transporter = config.pool
    ? nodemailer.createTransport({
        ...baseOpts,
        pool: true,
        maxConnections: config.maxConnections,
      } satisfies SMTPPool.Options)
    : nodemailer.createTransport(baseOpts);

  return {
    send: async (message: EmailMessage): Promise<Result<EmailReceipt, EmailError>> => {
      try {
        const info = await transporter.sendMail({
          from: message.from,
          to: [...message.to],
          cc: message.cc === undefined ? undefined : [...message.cc],
          bcc: message.bcc === undefined ? undefined : [...message.bcc],
          subject: message.subject,
          text: message.textBody,
          html: message.htmlBody,
        });
        return ok({
          messageId: info.messageId,
          acceptedAt: new Date().toISOString(),
        });
      } catch (caught) {
        return err(mapNodemailerError(caught));
      }
    },
  };
};
