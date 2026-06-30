// Adapter InMemory do EmailOutboxPort do partners (PARTNERS-INVITE-DOMAIN-EVENT / ADR-0047).
// Espelha `auth/adapters/outbox/auth-outbox.in-memory.ts`, GENERICO: `append` recebe
// `OutboxMessage[]` ja montadas. Usado em testes (unit/contrato) e no boot HTTP sem DB.
// Mesma semantica do adapter Drizzle (deteta eventId duplicado como a PK do banco).
//
// Inclui os helpers de CONSUMO do worker (withPendingBatch / findPendingForUpdate / markProcessed /
// markFailed / moveToDeadLetter) — esta tabela e consumida desde ja pelo email-dispatch. DLQ SEM
// tabela dedicada nesta fatia: `moveToDeadLetter` marca `processedAt` (sai do pending pool, preserva
// a row para auditoria). Ver email-outbox-repository.drizzle.ts.
//
// ADR-0015 (outbox), ADR-0014 (par_*). Sem `class` (factory de closures).

import { ok, err } from '#src/shared/primitives/result.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import type {
  EmailOutboxPort,
  OutboxMessage,
  OutboxRow,
  OutboxQueryError,
  OutboxBatchOps,
} from '../../application/ports/email-outbox.ts';
import { outboxAppendDuplicateEventId } from '../../application/ports/email-outbox.ts';

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
 * InMemoryParEmailOutbox — adapter InMemory do EmailOutboxPort do partners + auxiliares do worker.
 *
 * Expoe `all()`/`pending()` para inspecao em testes e os helpers do worker (mesma interface que o
 * adapter Drizzle). `append` rejeita eventId duplicado (espelha a PK do banco). `setAttempts`/`clear`
 * sao exclusivos de teste.
 */
export const InMemoryParEmailOutbox = (): {
  port: EmailOutboxPort;
  all: () => readonly OutboxRow[];
  pending: () => readonly OutboxRow[];
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
  setAttempts: (eventId: string, attempts: number) => void;
  clear: () => void;
} => {
  const rows: OutboxRow[] = [];
  const seenIds = new Set<string>();

  const port: EmailOutboxPort = {
    append: async (messages) => {
      if (messages.length === 0) return ok(undefined);

      const now = new Date();
      const inserts = messages.map((m) => messageToRow(m, now));

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

  const findPendingForUpdate = async (
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> => {
    const pending = rows
      .filter((r) => r.processedAt === null)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .slice(0, limit);
    return ok(pending as readonly OutboxRow[]);
  };

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

  const moveToDeadLetter = async (
    eventId: string,
    now: Date,
    _errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row?.processedAt === null) {
      (row as { processedAt: Date | null }).processedAt = now;
    }
    return ok(undefined);
  };

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

  const setAttempts = (eventId: string, attempts: number): void => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row !== undefined) {
      (row as { attempts: number }).attempts = attempts;
    }
  };

  const clear = (): void => {
    rows.length = 0;
    seenIds.clear();
  };

  return {
    port,
    all: () => rows as readonly OutboxRow[],
    pending: () => rows.filter((r) => r.processedAt === null) as readonly OutboxRow[],
    withPendingBatch,
    findPendingForUpdate,
    markProcessed,
    markFailed,
    moveToDeadLetter,
    setAttempts,
    clear,
  };
};
