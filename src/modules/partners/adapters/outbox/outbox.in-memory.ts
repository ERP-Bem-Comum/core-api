// Adapter InMemory do OutboxPort + auxiliares do worker (módulo partners).
// Replica `contracts/adapters/outbox/outbox.in-memory.ts`, mas GENÉRICO: `append`
// recebe `OutboxMessage[]` já montadas. Usado em testes (unit/contrato) e no boot
// HTTP sem DB. Mesma interface assíncrona/semântica do adapter Drizzle.
//
// ADR-0015 (outbox), ADR-0014 (par_*). Sem `class` no adapter (factory de closures).

import { ok, err } from '#src/shared/primitives/result.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import type {
  OutboxPort,
  OutboxMessage,
  OutboxRow,
  OutboxQueryError,
  OutboxBatchOps,
} from '#src/modules/partners/application/ports/outbox.ts';
import { outboxAppendDuplicateEventId } from '#src/modules/partners/application/ports/outbox.ts';
import type { OutboxDeadLetterRow } from '../persistence/schemas/mysql.ts';

const OUTBOX_SCHEMA_VERSION = 1;

const messageToRow = (message: Readonly<OutboxMessage>, now: Date): OutboxRow => ({
  eventId: message.eventId,
  aggregateId: message.aggregateId,
  aggregateType: message.aggregateType,
  eventType: message.eventType,
  schemaVersion: OUTBOX_SCHEMA_VERSION,
  occurredAt: message.occurredAt,
  enqueuedAt: now,
  processedAt: null,
  attempts: 0,
  payload: message.payload,
});

/**
 * InMemoryOutbox — adapter InMemory do OutboxPort + auxiliares do worker.
 *
 * Expõe helpers de inspeção (`all`, `pending`, `deadLetter`) e os helpers do worker
 * (`withPendingBatch`, `findPendingForUpdate`, `markProcessed`, `markFailed`,
 * `moveToDeadLetter`) com a mesma semântica do adapter Drizzle. Detecta eventId
 * duplicado como a PK do banco (cada INSERT com mesmo `event_id` é rejeitado).
 */
export const InMemoryOutbox = (): {
  port: OutboxPort;
  // ── helpers de inspeção (síncronos) ──────────────────────────────────────
  all: () => readonly OutboxRow[];
  pending: () => readonly OutboxRow[];
  deadLetter: () => readonly OutboxDeadLetterRow[];
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
  /** Força o campo `attempts` de uma row. */
  setAttempts: (eventId: string, attempts: number) => void;
  /** Reseta o estado interno — útil para isolar eventos do teste. */
  clear: () => void;
} => {
  // Arrays mutáveis internamente — a API pública devolve readonly.
  const rows: OutboxRow[] = [];
  const dlqRows: OutboxDeadLetterRow[] = [];
  const seenIds = new Set<string>();

  // ── port.append ─────────────────────────────────────────────────────────

  const port: OutboxPort = {
    append: async (messages) => {
      if (messages.length === 0) return ok(undefined);

      const now = new Date();
      const inserts = messages.map((m) => messageToRow(m, now));

      // Verifica duplicatas antes de inserir qualquer row (transacional).
      for (const insert of inserts) {
        if (seenIds.has(insert.eventId)) {
          return err(outboxAppendDuplicateEventId(insert.eventId));
        }
      }

      for (const insert of inserts) {
        seenIds.add(insert.eventId);
        rows.push(insert);
      }

      return ok(undefined);
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
    // Idempotente: se já foi processado, no-op = ok.
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
    if (idx === -1) {
      // Semântica análoga ao Drizzle: not-found é no-op (idempotente).
      return ok(undefined);
    }
    const row = rows[idx];
    if (row === undefined) return ok(undefined);

    const dlqRow: OutboxDeadLetterRow = {
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
    };

    dlqRows.push(dlqRow);
    rows.splice(idx, 1);
    return ok(undefined);
  };

  // ── withPendingBatch ──────────────────────────────────────────────────────
  // Single-threaded: não há concorrência real, o "lock" é implícito.

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

  const clear = (): void => {
    rows.length = 0;
    dlqRows.length = 0;
    seenIds.clear();
  };

  return {
    port,
    all: () => rows as readonly OutboxRow[],
    pending: () => rows.filter((r) => r.processedAt === null) as readonly OutboxRow[],
    deadLetter: () => dlqRows as readonly OutboxDeadLetterRow[],
    withPendingBatch,
    findPendingForUpdate,
    markProcessed,
    markFailed,
    moveToDeadLetter,
    setAttempts,
    clear,
  };
};
