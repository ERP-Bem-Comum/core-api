/**
 * Public API do modulo notifications.
 *
 * Outros modulos (ex.: futuro Financeiro) importam APENAS daqui (ADR-0006).
 * Nunca importar de domain/, application/ ou adapters/ diretamente.
 *
 * Convencao: tipos exportados sem alias; smart constructors renomeados para
 * evitar conflito com nome do type (parseEmailAddress vs EmailAddress.parse).
 *
 * Adapter de teste (InMemory) NAO esta exposto aqui - importavel apenas
 * internamente em tests do proprio modulo. Producao usa createNodemailerEmailSender.
 *
 * ASCII puro.
 */

// Domain types
export type { EmailAddress, EmailAddressError } from '../domain/email/address.ts';
export { parse as parseEmailAddress } from '../domain/email/address.ts';

export type { EmailSubject, EmailSubjectError } from '../domain/email/subject.ts';
export { parse as parseEmailSubject } from '../domain/email/subject.ts';

export type { EmailMessage, EmailReceipt, EmailError } from '../domain/email/types.ts';

// Application port
export type { EmailSender } from '../application/ports/email-sender.ts';

// Application port - outbox de e-mail (entrega assincrona via worker; NOTIF-EMAIL-OUTBOX)
export type { EmailOutbox, EmailOutboxError } from '../application/ports/email-outbox.ts';

// Production adapter (Nodemailer)
export type { SmtpConfig, SmtpConfigError } from '../adapters/email/nodemailer-config.ts';
export { parseSmtpConfig } from '../adapters/email/nodemailer-config.ts';

export { createNodemailerEmailSender } from '../adapters/email/nodemailer.ts';

// Production adapter (Resend - HTTP API)
export type { ResendConfig, ResendConfigError } from '../adapters/email/resend-config.ts';
export { parseResendConfig } from '../adapters/email/resend-config.ts';

export { createResendEmailSender } from '../adapters/email/resend.ts';

// Composicao por env (deploy) - NOTIF-EMAIL-DEPLOY-CONFIG (materializa ADR-0010).
export type {
  EmailConfig,
  EmailConfigError,
  EmailProvider,
  EmailFromKind,
} from '../adapters/email/email-config.ts';
export { parseEmailConfig, resolveFrom } from '../adapters/email/email-config.ts';

export { withSandboxRedirect } from '../adapters/email/sandbox-redirect.ts';

export { buildEmailSender } from '../adapters/email/build-email-sender.ts';

// Consumidor de eventos de e-mail transacional (NOTIF-EMAIL-EVENT-CONSUMER / ADR-0047 fatia 02).
// O worker `email-dispatch` (composition root) instancia este EventDelivery<OutboxRow>.
export { createEmailEventDelivery } from '../adapters/event-delivery/email-event-delivery.ts';
