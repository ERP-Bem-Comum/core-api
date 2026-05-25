import { ok, err } from '../../../../shared/primitives/result.ts';
import type { Result } from '../../../../shared/primitives/result.ts';
import type { OutboxPort } from '../../application/ports/outbox.ts';
import { outboxAppendDuplicateEventId } from '../../application/ports/outbox.ts';
import { eventToOutboxInsert, type OutboxRow } from '../persistence/mappers/outbox.mapper.ts';
import type { ctrOutboxDeadLetter } from '../persistence/schemas/mysql.ts';
import type { OutboxQueryError } from '../persistence/repos/outbox-repository.drizzle.ts';

// ─── Dead letter row type (inferred from schema) ──────────────────────────────

export type OutboxDeadLetterRow = typeof ctrOutboxDeadLetter.$inferSelect;

// ─── InMemoryOutbox ───────────────────────────────────────────────────────────

/**
 * Adapter InMemory do OutboxPort + auxiliares do worker.
 *
 * Usado em:
 * - Testes unitários e contratuais (InMemoryOutbox é o adapter de referência).
 * - CLI da P.O. com driver `memory`.
 *
 * Expõe helpers de inspeção (`all`, `pending`) e os 4 helpers do worker
 * (`findPendingForUpdate`, `markProcessed`, `markFailed`, `moveToDeadLetter`)
 * com a mesma interface assíncrona/semântica do adapter Drizzle — permitindo
 * que os testes do worker rodem sem MySQL.
 *
 * Helpers adicionais de teste:
 * - `setAttempts(eventId, n)` — força o campo `attempts` de uma row (CA-T4).
 * - `corruptRow(eventId, patch)` — patcha campos internos (CA-T5, ex.: schemaVersion=999).
 * - `deadLetter()` — lista as rows na DLQ in-memory.
 * - `markProcessed(eventId)` — helper síncrono legado (mantido para compatibilidade).
 * - `clear()` — reseta o estado interno.
 *
 * A detecção de eventId duplicado segue a mesma semântica da PK do banco:
 * cada INSERT com mesmo `event_id` seria rejeitado — aqui simulamos com Set.
 */
export const InMemoryOutbox = (): {
  port: OutboxPort;
  // ── helpers de inspeção (síncronos) ──────────────────────────────────────
  all: () => readonly OutboxRow[];
  pending: () => readonly OutboxRow[];
  deadLetter: () => readonly OutboxDeadLetterRow[];
  // ── helpers do worker (mesma interface que o adapter Drizzle) ────────────
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
  // ── helpers exclusivos de teste (sem equivalente no Drizzle) ─────────────
  /**
   * Marca um evento como processado de forma síncrona.
   * Usado pela suite contratual (`outbox.contract.ts`) que exige assinatura `(id) => void`.
   * Para o worker, use `markProcessed(eventId, now)` (async, mesma semântica do Drizzle).
   */
  markProcessedSync: (eventId: string) => void;
  /** Força o campo `attempts` de uma row — útil para CA-T4. */
  setAttempts: (eventId: string, attempts: number) => void;
  /** Patcha campos internos de uma row — útil para CA-T5 (ex.: schemaVersion=999). */
  corruptRow: (eventId: string, patch: Readonly<Partial<OutboxRow>>) => void;
  /** Reseta o estado interno — útil em setupWorld para isolar eventos do teste. */
  clear: () => void;
} => {
  // Arrays mutáveis internamente — a API pública devolve readonly.
  const rows: OutboxRow[] = [];
  const dlqRows: OutboxDeadLetterRow[] = [];
  const seenIds = new Set<string>();

  // ── port.append ────────────────────────────────────────────────────────────

  const port: OutboxPort = {
    append: async (events) => {
      // No-op seguro para lista vazia.
      if (events.length === 0) return ok(undefined);

      const now = new Date();
      const inserts = events.map((e) => eventToOutboxInsert(e, now));

      // Verifica duplicatas antes de inserir qualquer row (transacional).
      for (const insert of inserts) {
        if (seenIds.has(insert.eventId)) {
          return err(outboxAppendDuplicateEventId(insert.eventId));
        }
      }

      for (const insert of inserts) {
        seenIds.add(insert.eventId);
        // OutboxInsert já tem processedAt: null e attempts: 0 por construção.
        rows.push(insert as OutboxRow);
      }

      return ok(undefined);
    },
  };

  // ── findPendingForUpdate ───────────────────────────────────────────────────
  // Semântica análoga ao SELECT ... FOR UPDATE SKIP LOCKED do Drizzle:
  // retorna até `limit` rows onde processedAt === null, ordenadas por occurredAt.
  // InMemory não tem concorrência real — SKIP LOCKED é no-op (array é single-threaded).

  const findPendingForUpdate = async (
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> => {
    const pending = rows
      .filter((r) => r.processedAt === null)
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .slice(0, limit);
    return ok(pending as readonly OutboxRow[]);
  };

  // ── markProcessed ──────────────────────────────────────────────────────────
  // Aceita `now` opcional: se não fornecido, usa new Date() (compatibilidade com
  // o helper síncrono legado que não passava `now`).

  const markProcessed = async (
    eventId: string,
    now: Date = new Date(),
  ): Promise<Result<void, OutboxQueryError>> => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row?.processedAt === null) {
      // Mutação controlada apenas dentro do adapter InMemory.
      (row as { processedAt: Date | null }).processedAt = now;
    }
    // Idempotente: se já foi processado, 0 rows affected = ok.
    return ok(undefined);
  };

  // ── markFailed ─────────────────────────────────────────────────────────────
  // Incrementa `attempts` na row. `errorTag` e `now` são aceitos para paridade
  // de assinatura com o adapter Drizzle (InMemory não tem coluna last_failed_at).

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

  // ── moveToDeadLetter ───────────────────────────────────────────────────────
  // Move a row da outbox para a DLQ in-memory de forma "atômica" (operações
  // síncronas sobre arrays — sem risco de race em ambiente single-threaded).

  const moveToDeadLetter = async (
    eventId: string,
    now: Date,
    errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    const idx = rows.findIndex((r) => r.eventId === eventId);
    if (idx === -1) {
      // Semântica análoga ao Drizzle: not-found é ok (idempotente).
      return ok(undefined);
    }
    const row = rows[idx];
    if (row === undefined) return ok(undefined);

    // Criar a row da DLQ a partir da row da outbox.
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
    // Remove da outbox.
    rows.splice(idx, 1);
    return ok(undefined);
  };

  // ── helpers exclusivos de teste ────────────────────────────────────────────

  const markProcessedSync = (eventId: string): void => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row?.processedAt === null) {
      (row as { processedAt: Date | null }).processedAt = new Date();
    }
  };

  const setAttempts = (eventId: string, attempts: number): void => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row !== undefined) {
      (row as { attempts: number }).attempts = attempts;
    }
  };

  const corruptRow = (eventId: string, patch: Readonly<Partial<OutboxRow>>): void => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row !== undefined) {
      Object.assign(row, patch);
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
    findPendingForUpdate,
    markProcessed,
    markFailed,
    moveToDeadLetter,
    markProcessedSync,
    setAttempts,
    corruptRow,
    clear,
  };
};
