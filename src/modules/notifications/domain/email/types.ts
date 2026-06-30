/**
 * EmailMessage, EmailReceipt, EmailError - tipos comuns do dominio de email.
 *
 * ASCII puro.
 */

import type { EmailAddress } from './address.ts';
import type { EmailSubject } from './subject.ts';

export type EmailMessage = Readonly<{
  from: EmailAddress;
  to: readonly EmailAddress[];
  cc?: readonly EmailAddress[];
  bcc?: readonly EmailAddress[];
  subject: EmailSubject;
  textBody: string;
  htmlBody?: string;
}>;

export type EmailReceipt = Readonly<{
  messageId: string; // UUID v4
  acceptedAt: string; // ISO-8601
}>;

export type EmailError =
  | Readonly<{ tag: 'invalid-recipient'; reason: string }>
  | Readonly<{ tag: 'smtp-rejected'; reason: string }>
  | Readonly<{ tag: 'transport-failed'; reason: string }>;
