// Adapter Drizzle do EmailOutbox + auxiliares do worker (módulo notifications).
// Molde: `partners/adapters/persistence/repos/outbox-repository.drizzle.ts`, adaptado
// para enqueue de e-mail (EmailMessage + idempotencyKey; payload = JSON serializado).
//
//   - enqueue(message, idempotencyKey) — INSERT em notifications_email_outbox.
//     ER_DUP_ENTRY (idempotency_key UNIQUE) → EmailOutboxDuplicate (CA2).
//   - withPendingBatch / findPendingForUpdate / markProcessed / markFailed / moveToDeadLetter.
//
// ADR-0015 (outbox), ADR-0014 (notifications_*), ADR-0020 (sem JSON nativo).
// Boundary: try/catch → Result. A coluna `idempotency_key` NÃO faz parte do OutboxRow
// canônico (visão do worker) — o SELECT do worker projeta só os campos canônicos.

import { isNull, asc, eq, and } from 'drizzle-orm';
import process from 'node:process';
import { randomUUID } from 'node:crypto';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  EmailOutbox,
  EmailOutboxError,
  OutboxRow,
  OutboxQueryError,
  OutboxBatchOps,
} from '../../application/ports/email-outbox.ts';
import {
  emailOutboxAppendUnavailable,
  emailOutboxDuplicate,
  outboxQueryUnavailable,
  outboxEventNotFound,
} from '../../application/ports/email-outbox.ts';
import type { EmailMessage } from '../../domain/email/types.ts';
import type { NotificationsMysqlHandle } from '../persistence/drivers/mysql-driver.ts';
import * as schema from '../persistence/schemas/mysql.ts';
import { serializeEmailMessage } from './email-message.mapper.ts';

const SCHEMA_VERSION = 1;
const AGGREGATE_TYPE = 'EmailMessage';
const EVENT_TYPE = 'EmailEnqueued';

// Projeção da row do schema na visão canônica do worker (omite idempotency_key).
const toCanonical = (
  row: Readonly<typeof schema.notificationsEmailOutbox.$inferSelect>,
): OutboxRow => ({
  eventId: row.eventId,
  aggregateId: row.aggregateId,
  aggregateType: row.aggregateType,
  eventType: row.eventType,
  schemaVersion: row.schemaVersion,
  occurredAt: row.occurredAt,
  enqueuedAt: row.enqueuedAt,
  processedAt: row.processedAt,
  attempts: row.attempts,
  payload: row.payload,
});

const isDupEntry = (e: unknown): boolean => {
  const candidates: unknown[] = [e];
  if (e instanceof Error && e.cause !== undefined) candidates.push(e.cause);
  return candidates.some((c) => {
    if (typeof c === 'object' && c !== null) {
      const obj = c as Record<string, unknown>;
      if (obj['errno'] === 1062) return true;
      if (typeof obj['code'] === 'string' && obj['code'] === 'ER_DUP_ENTRY') return true;
    }
    const msg = String(c instanceof Error ? c.message : c);
    return msg.includes('Duplicate entry') || msg.includes('ER_DUP_ENTRY');
  });
};

const safe = async <T>(ctx: string, op: () => Promise<T>): Promise<Result<T, OutboxQueryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[notifications-email-outbox:${ctx}] ${String(cause)}\n`);
    return err(outboxQueryUnavailable(String(cause)));
  }
};

export const createDrizzleEmailOutbox = (
  handle: NotificationsMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): EmailOutbox & {
  withPendingBatch: <R>(
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ) => Promise<Result<R, OutboxQueryError>>;
  findPendingForUpdate: (limit: number) => Promise<Result<readonly OutboxRow[], OutboxQueryError>>;
  markProcessed: (eventId: string, now: Date) => Promise<Result<void, OutboxQueryError>>;
  markFailed: (
    eventId: string,
    now: Date,
    errorTag: string,
    attempt: number,
  ) => Promise<Result<void, OutboxQueryError>>;
  moveToDeadLetter: (
    eventId: string,
    now: Date,
    errorMessage: string,
  ) => Promise<Result<void, OutboxQueryError>>;
} => {
  const { db } = handle;
  const table = schema.notificationsEmailOutbox;

  // ── enqueue ─────────────────────────────────────────────────────────────────

  const enqueue = async (
    message: EmailMessage,
    idempotencyKey: string,
  ): Promise<Result<{ eventId: string }, EmailOutboxError>> => {
    const now = new Date();
    const eventId = randomUUID();
    try {
      await db.insert(table).values({
        eventId,
        aggregateId: randomUUID(),
        aggregateType: AGGREGATE_TYPE,
        eventType: EVENT_TYPE,
        schemaVersion: SCHEMA_VERSION,
        occurredAt: now,
        enqueuedAt: now,
        processedAt: null,
        attempts: 0,
        payload: serializeEmailMessage(message),
        idempotencyKey,
      });
      return ok({ eventId });
    } catch (cause) {
      if (isDupEntry(cause)) return err(emailOutboxDuplicate(idempotencyKey));
      process.stderr.write(`[notifications-email-outbox:enqueue] ${String(cause)}\n`);
      return err(emailOutboxAppendUnavailable());
    }
  };

  // ── findPendingForUpdate ──────────────────────────────────────────────────

  const findPendingForUpdate = async (
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> =>
    safe('findPendingForUpdate', async () => {
      const rows = await db
        .select()
        .from(table)
        .where(isNull(table.processedAt))
        .orderBy(asc(table.processedAt), asc(table.occurredAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      return rows.map(toCanonical);
    });

  // ── withPendingBatch ──────────────────────────────────────────────────────

  const withPendingBatch = async <R>(
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    try {
      const result = await db.transaction(async (tx) => {
        const raw = await tx
          .select()
          .from(table)
          .where(isNull(table.processedAt))
          .orderBy(asc(table.processedAt), asc(table.occurredAt))
          .limit(limit)
          .for('update', { skipLocked: true });
        const rows = raw.map(toCanonical);

        const ops: OutboxBatchOps = {
          markProcessed: async (eventId, nowAt) =>
            safe('withPendingBatch:markProcessed', async () => {
              await tx
                .update(table)
                .set({ processedAt: nowAt })
                .where(and(eq(table.eventId, eventId), isNull(table.processedAt)));
            }),
          markFailed: async (eventId, _nowAt, _tag, attempt) =>
            safe('withPendingBatch:markFailed', async () => {
              await tx.update(table).set({ attempts: attempt }).where(eq(table.eventId, eventId));
            }),
          moveToDeadLetter: async (eventId, nowAt, errorMessage) =>
            safe('withPendingBatch:moveToDeadLetter', async () => {
              const target = rows.find((r) => r.eventId === eventId);
              if (target === undefined) return;
              await tx.insert(schema.notificationsEmailOutboxDeadLetter).values({
                eventId: target.eventId,
                aggregateId: target.aggregateId,
                aggregateType: target.aggregateType,
                eventType: target.eventType,
                schemaVersion: target.schemaVersion,
                occurredAt: target.occurredAt,
                enqueuedAt: target.enqueuedAt,
                failedAt: nowAt,
                attempts: target.attempts,
                lastError: errorMessage,
                payload: target.payload,
              });
              await tx.delete(table).where(eq(table.eventId, eventId));
            }),
        };

        return handler(rows, ops);
      });
      return ok(result);
    } catch (cause) {
      process.stderr.write(`[notifications-email-outbox:withPendingBatch] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  // ── markProcessed ─────────────────────────────────────────────────────────

  const markProcessed = async (
    eventId: string,
    now: Date,
  ): Promise<Result<void, OutboxQueryError>> =>
    safe('markProcessed', async () => {
      await db
        .update(table)
        .set({ processedAt: now })
        .where(and(eq(table.eventId, eventId), isNull(table.processedAt)));
    });

  // ── markFailed ────────────────────────────────────────────────────────────

  const markFailed = async (
    eventId: string,
    now: Date,
    errorTag: string,
    attempt: number,
  ): Promise<Result<void, OutboxQueryError>> => {
    void now;
    void errorTag;
    return safe('markFailed', async () => {
      await db.update(table).set({ attempts: attempt }).where(eq(table.eventId, eventId));
    });
  };

  // ── moveToDeadLetter ──────────────────────────────────────────────────────

  const moveToDeadLetter = async (
    eventId: string,
    now: Date,
    errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    try {
      const txResult: [OutboxQueryError | null] = [null];
      await db.transaction(async (tx) => {
        const rows = await tx.select().from(table).where(eq(table.eventId, eventId)).for('update');
        const row = rows[0];
        if (row === undefined) {
          txResult[0] = outboxEventNotFound(eventId);
          return;
        }
        await tx.insert(schema.notificationsEmailOutboxDeadLetter).values({
          eventId: row.eventId,
          aggregateId: row.aggregateId,
          aggregateType: row.aggregateType,
          eventType: row.eventType,
          schemaVersion: row.schemaVersion,
          occurredAt: row.occurredAt,
          enqueuedAt: row.enqueuedAt,
          failedAt: now,
          attempts: row.attempts,
          lastError: errorMessage,
          payload: row.payload,
        });
        await tx.delete(table).where(eq(table.eventId, eventId));
      });
      const logicError = txResult[0];
      if (logicError !== null) return err(logicError);
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[notifications-email-outbox:moveToDeadLetter] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  return {
    enqueue,
    withPendingBatch,
    findPendingForUpdate,
    markProcessed,
    markFailed,
    moveToDeadLetter,
  };
};
