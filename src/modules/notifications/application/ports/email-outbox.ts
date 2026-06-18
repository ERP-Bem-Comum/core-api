// EmailOutbox — port produtor do outbox de e-mail do módulo `notifications`.
// `enqueue` recebe a `EmailMessage` (já validada/branded) + uma `idempotencyKey`,
// serializa em JSON e persiste uma linha pendente. Os tipos de CONSUMO (worker) são
// os canônicos compartilhados em `#src/shared/outbox` (CORE-OUTBOX-WORKER-GENERIC).
//
// ADR-0015 (outbox), ADR-0014 (notifications_* isolado), ADR-0006 (port = type).

import type { Result } from '#src/shared/primitives/result.ts';
import type { EmailMessage } from '../../domain/email/types.ts';

// ─── Consumo do outbox (worker) — tipos canônicos compartilhados ──────────────
export type {
  OutboxRow,
  OutboxQueryError,
  OutboxQueryUnavailable,
  OutboxEventNotFound,
  OutboxBatchOps,
  WorkerOutboxOps,
} from '#src/shared/outbox/index.ts';
export { outboxQueryUnavailable, outboxEventNotFound } from '#src/shared/outbox/index.ts';

// ─── Tagged errors (Padrão D) — enqueue ───────────────────────────────────────

export type EmailOutboxAppendUnavailable = Readonly<{ tag: 'EmailOutboxAppendUnavailable' }>;
export type EmailOutboxDuplicate = Readonly<{
  tag: 'EmailOutboxDuplicate';
  idempotencyKey: string;
}>;
export type EmailOutboxSerializationFailed = Readonly<{
  tag: 'EmailOutboxSerializationFailed';
  reason: string;
}>;

export type EmailOutboxError =
  | EmailOutboxAppendUnavailable
  | EmailOutboxDuplicate
  | EmailOutboxSerializationFailed;

export const emailOutboxAppendUnavailable = (): EmailOutboxAppendUnavailable => ({
  tag: 'EmailOutboxAppendUnavailable',
});
export const emailOutboxDuplicate = (idempotencyKey: string): EmailOutboxDuplicate => ({
  tag: 'EmailOutboxDuplicate',
  idempotencyKey,
});
export const emailOutboxSerializationFailed = (reason: string): EmailOutboxSerializationFailed => ({
  tag: 'EmailOutboxSerializationFailed',
  reason,
});

// ─── Port ─────────────────────────────────────────────────────────────────────

/**
 * EmailOutbox — driven port para enfileirar e-mail (entrega assíncrona pelo worker).
 *
 * `enqueue(message, idempotencyKey)` persiste UMA linha pendente (processedAt=null,
 * attempts=0, payload=JSON da mensagem). `idempotencyKey` repetida → `EmailOutboxDuplicate`
 * (sem segunda linha — UNIQUE no banco).
 */
export type EmailOutbox = Readonly<{
  enqueue: (
    message: EmailMessage,
    idempotencyKey: string,
  ) => Promise<Result<{ eventId: string }, EmailOutboxError>>;
}>;
