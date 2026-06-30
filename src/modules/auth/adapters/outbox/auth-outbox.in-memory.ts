// Adapter InMemory do OutboxPort do auth (AUTH-DOMAIN-OUTBOX / ADR-0047).
// Espelha `partners/adapters/outbox/outbox.in-memory.ts`, GENERICO: `append` recebe
// `OutboxMessage[]` ja montadas. Usado em testes (unit/contrato) e no boot HTTP sem DB.
// Mesma semantica do adapter Drizzle (deteta eventId duplicado como a PK do banco).
//
// NOTIF-EMAIL-EVENT-CONSUMER (fatia 02): adiciona os helpers de CONSUMO do worker
// (withPendingBatch / findPendingForUpdate / markProcessed / markFailed / moveToDeadLetter),
// com a mesma semantica do adapter Drizzle. DLQ SEM tabela dedicada nesta fatia: `moveToDeadLetter`
// marca `processedAt` (sai do pending pool, preserva a row para auditoria) — `auth_outbox_dead_letter`
// e diferido (exigiria migration). Ver outbox-repository.drizzle.ts.
//
// ADR-0015 (outbox), ADR-0014 (auth_*). Sem `class` (factory de closures).

import { ok, err } from '#src/shared/primitives/result.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import type {
  OutboxPort,
  OutboxMessage,
  OutboxRow,
  OutboxQueryError,
  OutboxBatchOps,
} from '../../application/ports/outbox.ts';
import { outboxAppendDuplicateEventId } from '../../application/ports/outbox.ts';

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
 * InMemoryAuthOutbox — adapter InMemory do OutboxPort do auth + auxiliares do worker.
 *
 * Expoe `all()`/`pending()` para inspecao em testes e os helpers do worker (mesma interface
 * que o adapter Drizzle). `append` rejeita eventId duplicado (espelha a PK do banco).
 * `setAttempts`/`clear` sao exclusivos de teste.
 */
export const InMemoryAuthOutbox = (): {
  port: OutboxPort;
  // ── helpers de inspecao (sincronos) ───────────────────────────────────────
  all: () => readonly OutboxRow[];
  pending: () => readonly OutboxRow[];
  // ── helpers do worker (mesma interface que o adapter Drizzle) ─────────────
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
  // ── helpers exclusivos de teste ───────────────────────────────────────────
  /** Forca o campo `attempts` de uma row. */
  setAttempts: (eventId: string, attempts: number) => void;
  /** Reseta o estado interno. */
  clear: () => void;
} => {
  const rows: OutboxRow[] = [];
  const seenIds = new Set<string>();

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

  // ── findPendingForUpdate ────────────────────────────────────────────────────

  const findPendingForUpdate = async (
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> => {
    const pending = rows
      .filter((r) => r.processedAt === null)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .slice(0, limit);
    return ok(pending as readonly OutboxRow[]);
  };

  // ── markProcessed (idempotente) ─────────────────────────────────────────────

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

  // ── markFailed (incrementa attempts; segue pendente) ────────────────────────

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

  // ── moveToDeadLetter ────────────────────────────────────────────────────────
  // SEM tabela DLQ nesta fatia: marca `processedAt` (sai do pending pool) e preserva a row
  // para auditoria. Espelha a semantica do adapter Drizzle. `errorMessage` reservado para a
  // futura `auth_outbox_dead_letter` (migration diferida).
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

  // ── withPendingBatch (single-threaded: lock implicito) ──────────────────────

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

  // ── helpers exclusivos de teste ─────────────────────────────────────────────

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
