/**
 * InMemoryEmailSender - adapter de teste para EmailSender.
 *
 * Padrao "observable test double": expoe getSent() e clear() alem de send().
 * Consistente com src/shared/adapters/clock-fixed.ts.
 *
 * Producao usa o adapter Nodemailer (CTR-EMAIL-ADAPTER-NODEMAILER, futuro).
 * ASCII puro.
 */

import { randomUUID } from 'node:crypto';

import { ok } from '../../../../shared/primitives/result.ts';
import type { EmailSender } from '../../application/ports/email-sender.ts';
import type { EmailMessage } from '../../domain/email/types.ts';

export type InMemoryEmailSender = EmailSender &
  Readonly<{
    getSent: () => readonly EmailMessage[];
    clear: () => void;
  }>;

export const createInMemoryEmailSender = (): InMemoryEmailSender => {
  const sent: EmailMessage[] = [];

  return {
    send: async (message) => {
      await Promise.resolve();
      sent.push(message);
      return ok({
        messageId: randomUUID(),
        acceptedAt: new Date().toISOString(),
      });
    },
    getSent: () => sent,
    clear: () => {
      sent.length = 0;
    },
  };
};
