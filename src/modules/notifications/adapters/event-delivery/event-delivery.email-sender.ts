// Adapter de EventDelivery<EmailMessage> que entrega via EmailSender (NOTIF-EMAIL-OUTBOX).
//
// É o ponto onde o worker genérico (`#src/shared/outbox`) encontra o port de envio do
// módulo: `deliver(message)` chama `EmailSender.send(message)`. Falha de envio (EmailError)
// vira `DeliveryError` → o worker decide retry/DLQ pelos `attempts` (ADR-0015).
//
// ADR-0010 (Email Port/Adapter), ADR-0006 (Result na borda).

import { ok, err } from '#src/shared/primitives/result.ts';
import type { EventDelivery } from '#src/shared/outbox/index.ts';
import { deliveryUnavailable } from '#src/shared/outbox/index.ts';
import type { EmailMessage } from '../../domain/email/types.ts';
import type { EmailSender } from '../../application/ports/email-sender.ts';

/**
 * EmailSenderDelivery — entrega cada e-mail desserializado via EmailSender.send.
 * `consumerId` identifica o consumer nos logs/correlação do worker.
 */
export const EmailSenderDelivery = (
  sender: EmailSender,
  consumerId: string,
): EventDelivery<EmailMessage> => ({
  consumerId,
  deliver: async (message: EmailMessage) => {
    const sent = await sender.send(message);
    if (sent.ok) return ok(undefined);
    return err(deliveryUnavailable(`email-send-failed:${sent.error.tag}:${sent.error.reason}`));
  },
});
