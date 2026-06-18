/**
 * EventDelivery do worker email-dispatch (NOTIF-EMAIL-EVENT-CONSUMER / ADR-0047 fatia 02) —
 * vive no COMPOSITION ROOT (`src/workers/`, fora dos modulos): cola a row lida do `auth_outbox`
 * (pool do `auth`) ao consumidor de e-mail do `notifications` (`createEmailEventDelivery`, via
 * public-api). Nenhum modulo importa o outro (ADR-0006) — a ligacao e aqui.
 *
 * `P` = `OutboxRow` (o consumidor decodifica a row via auth/public-api). `rowToEmailRow` e a
 * identidade (o consumidor faz o decode). Generico sobre `runLoop`/`EventDelivery` de shared/outbox.
 */
import { ok } from '#src/shared/primitives/result.ts';
import type { EventDelivery, RowToProcessed, OutboxRow } from '#src/shared/outbox/index.ts';
import { createEmailEventDelivery } from '#src/modules/notifications/public-api/index.ts';
import type { EmailAddress, EmailSender } from '#src/modules/notifications/public-api/index.ts';

/** A row do auth_outbox e o proprio envelope: o consumidor a decodifica via auth/public-api. */
export const rowToEmailRow: RowToProcessed<OutboxRow> = (row) => ok(row);

/**
 * buildEmailDispatchDelivery — instancia o EventDelivery<OutboxRow> do notifications, ligado ao
 * EmailSender resolvido por deploy (`buildEmailSender(env)` no run.ts). Seam unico do worker.
 */
export const buildEmailDispatchDelivery = (
  deps: Readonly<{ emailSender: EmailSender; from: EmailAddress }>,
): EventDelivery<OutboxRow> => createEmailEventDelivery(deps);
