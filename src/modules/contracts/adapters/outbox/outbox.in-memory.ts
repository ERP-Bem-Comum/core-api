import { ok, err } from '../../../../shared/primitives/result.ts';
import type { Result } from '../../../../shared/primitives/result.ts';
import type { OutboxPort } from '../../application/ports/outbox.ts';
import { outboxAppendDuplicateEventId } from '../../application/ports/outbox.ts';
import { eventToOutboxInsert, type OutboxRow } from '../persistence/mappers/outbox.mapper.ts';
import type { ctrOutboxDeadLetter } from '../persistence/schemas/mysql.ts';
import type {
  OutboxQueryError,
  OutboxBatchOps,
  OutboxFailure,
} from '../../application/ports/outbox.ts';
import { createInMemoryProgressStore } from '#src/shared/outbox/in-memory-progress.ts';

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
  /**
   * Pendentes DE UM CONSUMIDOR. Substitui o antigo `pending()` sem argumento: perguntar "está
   * pendente?" sem dizer para quem é a ambiguidade que produziu #800/#824.
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
  // ── helpers exclusivos de teste (sem equivalente no Drizzle) ─────────────
  /**
   * Marca um evento como processado de forma síncrona, para um consumidor.
   * Para o worker, use `markProcessed(consumerId, eventId, now)` (async, semântica do Drizzle).
   */
  markProcessedSync: (consumerId: string, eventId: string) => void;
  /** Força as tentativas de um consumidor sobre um evento — útil para CA-T4. */
  setAttempts: (consumerId: string, eventId: string, attempts: number) => void;
  /** Patcha campos internos de uma row — útil para CA-T5 (ex.: schemaVersion=999). */
  corruptRow: (eventId: string, patch: Readonly<Partial<OutboxRow>>) => void;
  /** Reseta o estado interno — útil em setupWorld para isolar eventos do teste. */
  clear: () => void;
} => {
  // Arrays mutáveis internamente — a API pública devolve readonly.
  const rows: OutboxRow[] = [];
  const dlqRows: OutboxDeadLetterRow[] = [];
  const seenIds = new Set<string>();
  // Espelho em memória de `eventos_processados`: a pendência é POR CONSUMIDOR, não da linha.
  const progress = createInMemoryProgressStore();

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

  // ── markProcessed ──────────────────────────────────────────────────────────
  // Aceita `now` opcional: se não fornecido, usa new Date() (compatibilidade com
  // o helper síncrono legado que não passava `now`).

  const markProcessed = async (
    consumerId: string,
    eventId: string,
    now: Date = new Date(),
  ): Promise<Result<void, OutboxQueryError>> => {
    // Progresso DESTE consumidor; a linha do outbox não é tocada (#800, #824).
    progress.markProcessed(consumerId, eventId, now);
    // Idempotente: remarcar apenas reescreve o carimbo.
    return ok(undefined);
  };

  // ── markFailed ─────────────────────────────────────────────────────────────
  // Incrementa `attempts` na row. `errorTag` e `now` são aceitos para paridade
  // de assinatura com o adapter Drizzle (InMemory não tem coluna last_failed_at).

  const markFailed = async (
    consumerId: string,
    eventId: string,
    { errorTag, attempt }: OutboxFailure,
  ): Promise<Result<void, OutboxQueryError>> => {
    // Orçamento de retry por consumidor: na coluna global, a falha de um gastava as tentativas
    // do outro e o mandava à DLQ sem que ele jamais tivesse falhado.
    progress.markFailed(consumerId, eventId, errorTag, attempt);
    return ok(undefined);
  };

  // ── moveToDeadLetter ───────────────────────────────────────────────────────
  // Move a row da outbox para a DLQ in-memory de forma "atômica" (operações
  // síncronas sobre arrays — sem risco de race em ambiente single-threaded).

  const moveToDeadLetter = async (
    consumerId: string,
    eventId: string,
    now: Date,
    errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row === undefined) {
      // Semântica análoga ao Drizzle: not-found é ok (idempotente).
      return ok(undefined);
    }

    // Criar a row da DLQ a partir da row da outbox.
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
    // A desistência é DESTE consumidor: sai da fila dele, não da tabela.
    progress.markDeadLettered(consumerId, eventId, now, errorMessage);
    // ⚠️ Sem `rows.splice` — ele espelhava o `DELETE` do Drizzle e tirava o evento dos DEMAIS
    // consumidores, além de contrariar o ADR-0022:27-29 ("o outbox retém as entradas… não
    // deleta"), de que depende a reconstrução prometida em 0022:40.
    return ok(undefined);
  };

  // ── withPendingBatch ───────────────────────────────────────────────────────
  // Espelha a semântica transacional do adapter Drizzle. Ambiente single-threaded:
  // não há concorrência real, então o "lock" é implícito — o handler processa as
  // rows e marca via ops antes de qualquer outra chamada observar o estado.

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

  // ── helpers exclusivos de teste ────────────────────────────────────────────

  const markProcessedSync = (consumerId: string, eventId: string): void => {
    progress.markProcessed(consumerId, eventId, new Date());
  };

  const setAttempts = (consumerId: string, eventId: string, attempts: number): void => {
    progress.markFailed(consumerId, eventId, 'test-seeded', attempts);
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
    markProcessedSync,
    setAttempts,
    corruptRow,
    clear,
  };
};
