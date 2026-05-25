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

// Production adapter (Nodemailer)
export type { SmtpConfig, SmtpConfigError } from '../adapters/email/nodemailer-config.ts';
export { parseSmtpConfig } from '../adapters/email/nodemailer-config.ts';

export { createNodemailerEmailSender } from '../adapters/email/nodemailer.ts';
