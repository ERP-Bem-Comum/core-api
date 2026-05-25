/**
 * EmailSender port - contrato para envio de email.
 *
 * Implementacoes:
 *   - createInMemoryEmailSender (testes) - src/modules/notifications/adapters/email/in-memory.ts
 *   - Nodemailer (producao) - ticket CTR-EMAIL-ADAPTER-NODEMAILER (#2, futuro)
 *
 * ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { EmailError, EmailMessage, EmailReceipt } from '../../domain/email/types.ts';

export type EmailSender = Readonly<{
  send: (message: EmailMessage) => Promise<Result<EmailReceipt, EmailError>>;
}>;
