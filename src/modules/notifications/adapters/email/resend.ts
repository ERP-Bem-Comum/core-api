/**
 * createResendEmailSender - adapter de producao para EmailSender via API HTTP do Resend.
 *
 * Ticket: CTR-EMAIL-ADAPTER-RESEND (W1).
 *
 * Resend e API-first (HTTP), nao SMTP. O SDK 'resend' faz POST para api.resend.com.
 *
 * Estrategia:
 *   - Recebe ResendConfig (parseado via parseResendConfig) - sem env interna.
 *   - Constroi client Resend(apiKey).
 *   - emails.send() NAO lanca em erro de API: retorna { data, error }. O adapter
 *     trata DUAS frentes ate convergir no EmailError tagged union:
 *       1. result.error != null  -> mapResendError (rejeicao estruturada do provider).
 *       2. catch                 -> transport-failed (rede/DNS/timeout/throw inesperado).
 *
 * Nao desestruturamos { data, error }: a desestruturacao quebra o narrowing do
 * discriminated union do SDK. Acessamos via result.error / result.data.
 *
 * ASCII puro.
 */

import { Resend } from 'resend';

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { EmailSender } from '../../application/ports/email-sender.ts';
import type { EmailError, EmailMessage, EmailReceipt } from '../../domain/email/types.ts';
import type { ResendConfig } from './resend-config.ts';

/**
 * mapResendError - traduz o ErrorResponse estruturado do Resend em EmailError tagged.
 *
 * Buckets:
 *   - invalid-recipient: erro de validacao que aponta o campo `to`/recipient
 *     (e nao o `from`).
 *   - smtp-rejected:     qualquer outra rejeicao estruturada do provider (auth,
 *     rate-limit, quota, validacao de outros campos). O nome do union diz 'smtp'
 *     mas semanticamente significa "o provider rejeitou a requisicao".
 *
 * O parametro aceita { message, name } - subtipo do ErrorResponse do SDK.
 */
export const mapResendError = (error: Readonly<{ message: string; name: string }>): EmailError => {
  const { message, name } = error;
  const isValidation =
    name === 'validation_error' ||
    name === 'invalid_parameter' ||
    name === 'missing_required_field';
  const mentionsRecipient = /\b(to|recipient)\b/i.test(message);
  const mentionsFrom = /\bfrom\b/i.test(message);
  if (isValidation && mentionsRecipient && !mentionsFrom) {
    return { tag: 'invalid-recipient', reason: message };
  }
  return { tag: 'smtp-rejected', reason: message };
};

export const createResendEmailSender = (config: ResendConfig): EmailSender => {
  const client = new Resend(config.apiKey);

  return {
    send: async (message: EmailMessage): Promise<Result<EmailReceipt, EmailError>> => {
      try {
        const result = await client.emails.send({
          from: message.from,
          to: [...message.to],
          subject: message.subject,
          text: message.textBody,
          ...(message.htmlBody !== undefined ? { html: message.htmlBody } : {}),
          ...(message.cc !== undefined ? { cc: [...message.cc] } : {}),
          ...(message.bcc !== undefined ? { bcc: [...message.bcc] } : {}),
        });
        if (result.error !== null) {
          return err(mapResendError(result.error));
        }
        return ok({
          messageId: result.data.id,
          acceptedAt: new Date().toISOString(),
        });
      } catch (caught) {
        return err({
          tag: 'transport-failed',
          reason: caught instanceof Error ? caught.message : 'unknown non-Error throw',
        });
      }
    },
  };
};
