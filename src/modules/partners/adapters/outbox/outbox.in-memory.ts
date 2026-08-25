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
  OutboxFailure,
} from '#src/modules/partners/application/ports/outbox.ts';
import { outboxAppendDuplicateEventId } from '#src/modules/partners/application/ports/outbox.ts';
import { createInMemoryProgressStore } from '#src/shared/outbox/in-memory-progress.ts';
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
  /**
   * Pendentes DE UM CONSUMIDOR. Substitui o antigo `pending()` sem argumento, que perguntava
   * "está pendente?" sem dizer para quem — a própria pergunta que o defeito #800/#824 tornou
   * ambígua. Agora não há como formulá-la errado.
   */
  pendingFor: (consumerId: string) => readonly OutboxRow[];
  deadLetter: () => readonly OutboxDeadLetterRow[];
  // ── helpers do worker (mesma interface que o adapter Drizzle) ────────────
  withPendingBatch: <R>(
    consumerId: string,
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ) => Promise<Result<R, OutboxQueryError>>;
  findPendingForUpdate: (
    consumerId: string,
    limit: number,
  ) => Promise<Result<readonly OutboxRow[], OutboxQueryError>>;
  markProcessed: (
    consumerId: string,
    eventId: string,
    now?: Date,
  ) => Promise<Result<void, OutboxQueryError>>;
  markFailed: (
    consumerId: string,
    eventId: string,
    failure: OutboxFailure,
  ) => Promise<Result<void, OutboxQueryError>>;
  moveToDeadLetter: (
    consumerId: string,
    eventId: string,
    now: Date,
    errorMessage: string,
  ) => Promise<Result<void, OutboxQueryError>>;
  // ── helpers exclusivos de teste ──────────────────────────────────────────
  /** Força as tentativas de um consumidor sobre um evento. */
  setAttempts: (consumerId: string, eventId: string, attempts: number) => void;
  /** Reseta o estado interno — útil para isolar eventos do teste. */
  clear: () => void;
} => {
  // Arrays mutáveis internamente — a API pública devolve readonly.
  const rows: OutboxRow[] = [];
  const dlqRows: OutboxDeadLetterRow[] = [];
  const seenIds = new Set<string>();
  // Espelho em memória de `eventos_processados`: a pendência é POR CONSUMIDOR, não da linha.
  const progress = createInMemoryProgressStore();

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

  /** Pendentes DESTE consumidor, com `attempts` vindos do progresso dele. */
  const pendingRowsFor = (consumerId: string, limit: number): readonly OutboxRow[] =>
    rows
      .filter((r) => progress.isPending(consumerId, r.eventId))
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .slice(0, limit)
      .map((r) => ({ ...r, attempts: progress.attempts(consumerId, r.eventId) }));

  const findPendingForUpdate = async (
    consumerId: string,
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> => {
    return ok(pendingRowsFor(consumerId, limit));
  };

  // ── markProcessed ─────────────────────────────────────────────────────────

  const markProcessed = async (
    consumerId: string,
    eventId: string,
    now: Date = new Date(),
  ): Promise<Result<void, OutboxQueryError>> => {
    // Marca o progresso DESTE consumidor. A linha do outbox não é tocada: marcá-la resolveria o
    // evento para todos, que é o defeito de #800/#824.
    progress.markProcessed(consumerId, eventId, now);
    // Idempotente: remarcar apenas reescreve o carimbo.
    return ok(undefined);
  };

  // ── markFailed ────────────────────────────────────────────────────────────

  const markFailed = async (
    consumerId: string,
    eventId: string,
    { errorTag, attempt }: OutboxFailure,
  ): Promise<Result<void, OutboxQueryError>> => {
    // Orçamento de retry por consumidor — antes era a coluna global da linha, e a falha de um
    // gastava as tentativas do outro.
    progress.markFailed(consumerId, eventId, errorTag, attempt);
    return ok(undefined);
  };

  // ── moveToDeadLetter ──────────────────────────────────────────────────────

  const moveToDeadLetter = async (
    consumerId: string,
    eventId: string,
    now: Date,
    errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row === undefined) {
      // Semântica análoga ao Drizzle: not-found é no-op (idempotente).
      return ok(undefined);
    }

    const dlqRow: OutboxDeadLetterRow = {
      consumerId,
      eventId: row.eventId,
      aggregateId: row.aggregateId,
      aggregateType: row.aggregateType,
      eventType: row.eventType,
      schemaVersion: row.schemaVersion,
      occurredAt: row.occurredAt,
      enqueuedAt: row.enqueuedAt,
      failedAt: now,
      attempts: progress.attempts(consumerId, eventId),
      lastError: errorMessage,
      payload: row.payload,
    };

    dlqRows.push(dlqRow);
    // A desistência é DESTE consumidor: o evento sai da fila dele, não da tabela.
    progress.markDeadLettered(consumerId, eventId, now, errorMessage);
    // ⚠️ Sem `rows.splice` — o `splice` que existia aqui espelhava o `DELETE` do Drizzle e tirava
    // o evento dos DEMAIS consumidores. Também contrariava o ADR-0022:27-29 ("o outbox retém as
    // entradas… não deleta"), de que depende a reconstrução prometida em 0022:40.
    return ok(undefined);
  };

  // ── withPendingBatch ──────────────────────────────────────────────────────
  // Single-threaded: não há concorrência real, o "lock" é implícito.

  const withPendingBatch = async <R>(
    consumerId: string,
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    const pending = pendingRowsFor(consumerId, limit);
    // As ops nascem ligadas ao consumidor deste batch — como no Drizzle, onde ficam ligadas à tx.
    const ops: OutboxBatchOps = {
      markProcessed: async (eventId, now) => markProcessed(consumerId, eventId, now),
      markFailed: async (eventId, failure) => markFailed(consumerId, eventId, failure),
      moveToDeadLetter: async (eventId, now, errorMessage) =>
        moveToDeadLetter(consumerId, eventId, now, errorMessage),
    };
    const result = await handler(pending, ops);
    return ok(result);
  };

  // ── helpers exclusivos de teste ──────────────────────────────────────────

  const setAttempts = (consumerId: string, eventId: string, attempts: number): void => {
    progress.markFailed(consumerId, eventId, 'test-seeded', attempts);
  };

  const clear = (): void => {
    rows.length = 0;
    dlqRows.length = 0;
    seenIds.clear();
    progress.clear();
  };

  return {
    port,
    all: () => rows as readonly OutboxRow[],
    pendingFor: (consumerId: string) => pendingRowsFor(consumerId, rows.length),
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
