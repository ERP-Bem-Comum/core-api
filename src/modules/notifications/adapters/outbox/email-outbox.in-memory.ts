// Adapter InMemory do EmailOutbox + auxiliares do worker (módulo notifications).
// Molde: `partners/adapters/outbox/outbox.in-memory.ts`, adaptado para enqueue de
// e-mail (recebe EmailMessage + idempotencyKey, serializa o payload).
//
// Usado em testes (unit/contrato/worker) e em qualquer boot sem DB. Mesma
// interface/semântica do adapter Drizzle. ADR-0015, ADR-0014. Sem `class`.

import { randomUUID } from 'node:crypto';

import { ok, err } from '#src/shared/primitives/result.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import type {
  EmailOutbox,
  OutboxRow,
  OutboxQueryError,
  OutboxBatchOps,
} from '../../application/ports/email-outbox.ts';
import { emailOutboxDuplicate } from '../../application/ports/email-outbox.ts';
import type { EmailMessage } from '../../domain/email/types.ts';
import type { EmailOutboxDeadLetterRow } from '../persistence/schemas/mysql.ts';
import { serializeEmailMessage } from './email-message.mapper.ts';

const SCHEMA_VERSION = 1;
const AGGREGATE_TYPE = 'EmailMessage';
const EVENT_TYPE = 'EmailEnqueued';

export const InMemoryEmailOutbox = (): {
  port: EmailOutbox;
  // ── inspeção (síncrona) ──────────────────────────────────────────────────
  all: () => readonly OutboxRow[];
  pending: () => readonly OutboxRow[];
  deadLetter: () => readonly EmailOutboxDeadLetterRow[];
  // ── helpers do worker (mesma interface que o adapter Drizzle) ────────────
  withPendingBatch: <R>(
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ) => Promise<Result<R, OutboxQueryError>>;
  findPendingForUpdate: (limit: number) => Promise<Result<readonly OutboxRow[], OutboxQueryError>>;
  markProcessed: (eventId: string, now?: Date) => Promise<Result<void, OutboxQueryError>>;
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
  // ── helpers exclusivos de teste ──────────────────────────────────────────
  setAttempts: (eventId: string, attempts: number) => void;
  corruptPayload: (eventId: string, payload: string) => void;
  clear: () => void;
} => {
  const rows: OutboxRow[] = [];
  const dlqRows: EmailOutboxDeadLetterRow[] = [];
  const seenKeys = new Set<string>();

  // ── port.enqueue ──────────────────────────────────────────────────────────

  const port: EmailOutbox = {
    enqueue: async (message: EmailMessage, idempotencyKey: string) => {
      if (seenKeys.has(idempotencyKey)) {
        return err(emailOutboxDuplicate(idempotencyKey));
      }
      const now = new Date();
      const eventId = randomUUID();
      seenKeys.add(idempotencyKey);
      rows.push({
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
      });
      return ok({ eventId });
    },
  };

  // ── findPendingForUpdate ──────────────────────────────────────────────────

  const findPendingForUpdate = async (
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> => {
    const pending = rows
      .filter((r) => r.processedAt === null)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .slice(0, limit);
    return ok(pending as readonly OutboxRow[]);
  };

  // ── markProcessed ─────────────────────────────────────────────────────────

  const markProcessed = async (
    eventId: string,
    now: Date = new Date(),
  ): Promise<Result<void, OutboxQueryError>> => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row?.processedAt === null) {
      (row as { processedAt: Date | null }).processedAt = now;
    }
    return ok(undefined);
  };

  // ── markFailed ────────────────────────────────────────────────────────────

  const markFailed = async (
    eventId: string,
    _now: Date,
    _errorTag: string,
    attempt: number,
  ): Promise<Result<void, OutboxQueryError>> => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row !== undefined) {
      (row as { attempts: number }).attempts = attempt;
    }
    return ok(undefined);
  };

  // ── moveToDeadLetter ──────────────────────────────────────────────────────

  const moveToDeadLetter = async (
    eventId: string,
    now: Date,
    errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    const idx = rows.findIndex((r) => r.eventId === eventId);
    if (idx === -1) return ok(undefined);
    const row = rows[idx];
    if (row === undefined) return ok(undefined);

    dlqRows.push({
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
    rows.splice(idx, 1);
    return ok(undefined);
  };

  // ── withPendingBatch ──────────────────────────────────────────────────────

  const withPendingBatch = async <R>(
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    const pending = rows
      .filter((r) => r.processedAt === null)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .slice(0, limit) as readonly OutboxRow[];
    const ops: OutboxBatchOps = { markProcessed, markFailed, moveToDeadLetter };
    const result = await handler(pending, ops);
    return ok(result);
  };

  // ── helpers exclusivos de teste ──────────────────────────────────────────

  const setAttempts = (eventId: string, attempts: number): void => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row !== undefined) {
      (row as { attempts: number }).attempts = attempts;
    }
  };

  const corruptPayload = (eventId: string, payload: string): void => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row !== undefined) {
      (row as { payload: string }).payload = payload;
    }
  };

  const clear = (): void => {
    rows.length = 0;
    dlqRows.length = 0;
    seenKeys.clear();
  };

  return {
    port,
    all: () => rows as readonly OutboxRow[],
    pending: () => rows.filter((r) => r.processedAt === null) as readonly OutboxRow[],
    deadLetter: () => dlqRows as readonly EmailOutboxDeadLetterRow[],
    withPendingBatch,
    findPendingForUpdate,
    markProcessed,
    markFailed,
    moveToDeadLetter,
    setAttempts,
    corruptPayload,
    clear,
  };
};
