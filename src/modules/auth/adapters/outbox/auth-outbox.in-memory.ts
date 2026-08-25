// Adapter InMemory do OutboxPort do auth (AUTH-DOMAIN-OUTBOX / ADR-0047).
// Espelha `partners/adapters/outbox/outbox.in-memory.ts`, GENERICO: `append` recebe
// `OutboxMessage[]` ja montadas. Usado em testes (unit/contrato) e no boot HTTP sem DB.
// Mesma semantica do adapter Drizzle (deteta eventId duplicado como a PK do banco).
//
// NOTIF-EMAIL-EVENT-CONSUMER (fatia 02): adiciona os helpers de CONSUMO do worker
// (withPendingBatch / findPendingForUpdate / markProcessed / markFailed / moveToDeadLetter) POR
// CONSUMIDOR (#800, #824) — o progresso vive em `createInMemoryProgressStore`, o espelho em
// memoria de `eventos_processados`, nunca na propria row do outbox. DLQ SEM tabela dedicada
// nesta fatia: `moveToDeadLetter` marca `deadLetteredAt` no progresso DESTE consumidor (sai do
// pending pool DELE, preserva a row para os demais e para auditoria) — `auth_outbox_dead_letter`
// e diferido (exigiria migration). Ver outbox-repository.drizzle.ts.
//
// ADR-0015 (outbox), ADR-0014 (auth_*). Sem `class` (factory de closures).

import { ok, err } from '#src/shared/primitives/result.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import { createInMemoryProgressStore } from '#src/shared/outbox/in-memory-progress.ts';
import type {
  OutboxPort,
  OutboxMessage,
  OutboxRow,
  OutboxQueryError,
  OutboxBatchOps,
  OutboxFailure,
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
 * Expoe `all()`/`pendingFor(consumerId)` para inspecao em testes e os helpers do worker (mesma
 * interface que o adapter Drizzle, POR CONSUMIDOR — #800/#824). `append` rejeita eventId
 * duplicado (espelha a PK do banco). `setAttempts`/`clear` sao exclusivos de teste.
 */
export const InMemoryAuthOutbox = (): {
  port: OutboxPort;
  // ── helpers de inspecao (sincronos) ───────────────────────────────────────
  all: () => readonly OutboxRow[];
  /** Pendentes DE UM CONSUMIDOR — substitui o antigo `pending()` sem argumento. */
  pendingFor: (consumerId: string) => readonly OutboxRow[];
  // ── helpers do worker (mesma interface que o adapter Drizzle) ─────────────
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
  // ── helpers exclusivos de teste ───────────────────────────────────────────
  /** Forca as tentativas de um consumidor sobre um evento. */
  setAttempts: (consumerId: string, eventId: string, attempts: number) => void;
  /** Reseta o estado interno. */
  clear: () => void;
} => {
  const rows: OutboxRow[] = [];
  const seenIds = new Set<string>();
  // Espelho em memoria de `eventos_processados`: a pendencia e POR CONSUMIDOR, nao da linha.
  const progress = createInMemoryProgressStore();

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

  // ── markProcessed (idempotente) ─────────────────────────────────────────────

  const markProcessed = async (
    consumerId: string,
    eventId: string,
    now: Date = new Date(),
  ): Promise<Result<void, OutboxQueryError>> => {
    // Marca o progresso DESTE consumidor. A row do outbox nao e tocada: marca-la resolveria o
    // evento para todos, que e o defeito de #800/#824.
    progress.markProcessed(consumerId, eventId, now);
    return ok(undefined);
  };

  // ── markFailed (incrementa attempts DESTE consumidor; segue pendente) ──────────

  const markFailed = async (
    consumerId: string,
    eventId: string,
    // `now` não é desestruturado: nenhuma coluna in-memory guarda "hora da última falha".
    { errorTag, attempt }: OutboxFailure,
  ): Promise<Result<void, OutboxQueryError>> => {
    // Orcamento de retry por consumidor — antes era a coluna global da row, e a falha de um
    // gastava as tentativas do outro.
    progress.markFailed(consumerId, eventId, errorTag, attempt);
    return ok(undefined);
  };

  // ── moveToDeadLetter ────────────────────────────────────────────────────────
  // SEM tabela DLQ nesta fatia: marca `deadLetteredAt` no progresso DESTE consumidor — a row do
  // outbox segue intacta para os demais consumidores e para auditoria. Espelha a semantica do
  // adapter Drizzle.
  const moveToDeadLetter = async (
    consumerId: string,
    eventId: string,
    now: Date,
    errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    progress.markDeadLettered(consumerId, eventId, now, errorMessage);
    return ok(undefined);
  };

  // ── withPendingBatch (single-threaded: lock implicito) ──────────────────────

  const withPendingBatch = async <R>(
    consumerId: string,
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    const pending = pendingRowsFor(consumerId, limit);
    // As ops nascem ligadas ao consumidor deste batch — como no Drizzle, onde ficam ligadas a tx.
    const ops: OutboxBatchOps = {
      markProcessed: async (eventId, now) => markProcessed(consumerId, eventId, now),
      markFailed: async (eventId, failure) => markFailed(consumerId, eventId, failure),
      moveToDeadLetter: async (eventId, now, errorMessage) =>
        moveToDeadLetter(consumerId, eventId, now, errorMessage),
    };
    const result = await handler(pending, ops);
    return ok(result);
  };

  // ── helpers exclusivos de teste ─────────────────────────────────────────────

  const setAttempts = (consumerId: string, eventId: string, attempts: number): void => {
    progress.markFailed(consumerId, eventId, 'test-seeded', attempts);
  };

  const clear = (): void => {
    rows.length = 0;
    seenIds.clear();
    progress.clear();
  };

  return {
    port,
    all: () => rows as readonly OutboxRow[],
    pendingFor: (consumerId: string) => pendingRowsFor(consumerId, rows.length),
    withPendingBatch,
    findPendingForUpdate,
    markProcessed,
    markFailed,
    moveToDeadLetter,
    setAttempts,
    clear,
  };
};
