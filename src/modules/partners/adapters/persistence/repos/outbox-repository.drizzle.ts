// Adapter Drizzle do OutboxPort + auxiliares do worker (módulo partners).
// Replica `contracts/adapters/persistence/repos/outbox-repository.drizzle.ts`, mas
// GENÉRICO: opera sobre `OutboxMessage` já montadas (não eventos de domínio).
//
//   - append(messages) — batch INSERT em `par_outbox`. ER_DUP_ENTRY → tagged.
//   - appendOutboxInTx(tx, schema, messages) — INSERT batch DENTRO de uma tx já
//     aberta pelo repo do agregado (PAR-SUPPLIER-EVENTS) — estado + outbox na MESMA tx.
//   - withPendingBatch / findPendingForUpdate / markProcessed / markFailed / moveToDeadLetter.
//
// ADR-0015 (outbox), ADR-0014 (par_*), ADR-0020 (sem JSON nativo). Boundary: try/catch → Result.

import { isNull, asc, eq, and } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  OutboxPort,
  OutboxMessage,
  OutboxRow,
  OutboxAppendError,
  OutboxQueryError,
  OutboxBatchOps,
} from '#src/modules/partners/application/ports/outbox.ts';
import {
  outboxAppendUnavailable,
  outboxAppendDuplicateEventId,
  outboxQueryUnavailable,
  outboxEventNotFound,
} from '#src/modules/partners/application/ports/outbox.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';
import type { NewOutboxRow } from '../schemas/mysql.ts';
import * as schema from '../schemas/mysql.ts';

// ─── Schema version ───────────────────────────────────────────────────────────

/** Versão canônica do contrato do payload (wire format v1). */
export const OUTBOX_SCHEMA_VERSION = 1;

// CA guard: trava o drift schema↔port. Se `par_outbox` mudar de forma, a linha
// inferida (`$inferSelect`) deixa de ser equivalente ao `OutboxRow` do port e o
// typecheck quebra.
type OutboxRowSchema = typeof schema.parOutbox.$inferSelect;
type AssertTrue<T extends true> = T;
const _outboxRowDriftGuard: [
  AssertTrue<OutboxRowSchema extends OutboxRow ? true : false>,
  AssertTrue<OutboxRow extends OutboxRowSchema ? true : false>,
] = [true, true];
void _outboxRowDriftGuard;

// ─── message → insert ─────────────────────────────────────────────────────────

const messageToInsert = (message: Readonly<OutboxMessage>, now: Date): NewOutboxRow => ({
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

// ─── ER_DUP_ENTRY detection ───────────────────────────────────────────────────

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

// ─── appendOutboxInTx ─────────────────────────────────────────────────────────
//
// INSERT batch no outbox DENTRO de uma transação já aberta pelo repo do agregado
// (PAR-SUPPLIER-EVENTS). O repo pai chama esta função dentro do próprio
// `db.transaction(async (tx) => { ... })` — garantindo que estado + outbox são
// escritos na MESMA transação (ADR-0015). Lança em erro para que o Drizzle faça
// rollback; o repo pai converte o throw em Result na borda.
//
// `tx` é tipado structuralmente como `{ insert: ... }` para aceitar tanto
// `MySql2Database` quanto `MySqlTransaction` — ambos expõem `.insert()`.
export const appendOutboxInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: { insert: PartnersMysqlHandle['db']['insert'] },
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  schemaArg: typeof schema,
  messages: readonly OutboxMessage[],
): Promise<void> => {
  if (messages.length === 0) return;
  const now = new Date();
  const inserts = messages.map((m) => messageToInsert(m, now));
  await tx.insert(schemaArg.parOutbox).values(inserts);
};

// ─── safe wrapper ─────────────────────────────────────────────────────────────

const safe = async <T>(ctx: string, op: () => Promise<T>): Promise<Result<T, OutboxQueryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[partners-outbox-repo:${ctx}] ${String(cause)}\n`);
    return err(outboxQueryUnavailable(String(cause)));
  }
};

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * createDrizzleOutboxRepository — OutboxPort + auxiliares do worker para MySQL via Drizzle.
 *
 * Funções públicas do port:
 *   - `append(messages)` — batch INSERT em `par_outbox`. ER_DUP_ENTRY → tagged.
 *
 * Auxiliares do worker:
 *   - `findPendingForUpdate(limit)` — SELECT WHERE processed_at IS NULL ORDER BY occurred_at FOR UPDATE SKIP LOCKED.
 *   - `withPendingBatch(limit, handler)` — UMA tx: claim + delivery + marcação (lock até COMMIT).
 *   - `markProcessed(eventId, now)` — UPDATE processed_at WHERE processed_at IS NULL (idempotente).
 *   - `markFailed(eventId, now, errorTag, attempt)` — UPDATE attempts.
 *   - `moveToDeadLetter(eventId, now, errorMessage)` — INSERT DLQ + DELETE outbox (transação).
 */
export const createDrizzleOutboxRepository = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): OutboxPort & {
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

  // ── append ────────────────────────────────────────────────────────────────

  const append = async (
    messages: readonly OutboxMessage[],
  ): Promise<Result<void, OutboxAppendError>> => {
    if (messages.length === 0) return ok(undefined);

    const now = new Date();
    const inserts = messages.map((m) => messageToInsert(m, now));

    try {
      await db.insert(schema.parOutbox).values(inserts);
      return ok(undefined);
    } catch (cause) {
      if (isDupEntry(cause)) {
        const firstId = inserts[0]?.eventId ?? 'unknown';
        return err(outboxAppendDuplicateEventId(firstId));
      }
      process.stderr.write(`[partners-outbox-repo:append] ${String(cause)}\n`);
      return err(outboxAppendUnavailable());
    }
  };

  // ── findPendingForUpdate ──────────────────────────────────────────────────

  const findPendingForUpdate = async (
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> => {
    return safe('findPendingForUpdate', async () => {
      const rows = await db
        .select()
        .from(schema.parOutbox)
        .where(isNull(schema.parOutbox.processedAt))
        .orderBy(asc(schema.parOutbox.processedAt), asc(schema.parOutbox.occurredAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      return rows as readonly OutboxRow[];
    });
  };

  // ── withPendingBatch ──────────────────────────────────────────────────────
  // Consumo concorrente correto: abre UMA transação, trava até `limit` rows com
  // FOR UPDATE SKIP LOCKED, e invoca `handler` com as rows + ops de marcação
  // ligadas à MESMA transação (tx). O lock sobrevive até o COMMIT.

  const withPendingBatch = async <R>(
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    try {
      const result = await db.transaction(async (tx) => {
        const rows = (await tx
          .select()
          .from(schema.parOutbox)
          .where(isNull(schema.parOutbox.processedAt))
          .orderBy(asc(schema.parOutbox.processedAt), asc(schema.parOutbox.occurredAt))
          .limit(limit)
          .for('update', { skipLocked: true })) as readonly OutboxRow[];

        const ops: OutboxBatchOps = {
          markProcessed: async (eventId, now) =>
            safe('withPendingBatch:markProcessed', async () => {
              await tx
                .update(schema.parOutbox)
                .set({ processedAt: now })
                .where(
                  and(eq(schema.parOutbox.eventId, eventId), isNull(schema.parOutbox.processedAt)),
                );
            }),
          markFailed: async (eventId, _now, _errorTag, attempt) =>
            safe('withPendingBatch:markFailed', async () => {
              await tx
                .update(schema.parOutbox)
                .set({ attempts: attempt })
                .where(eq(schema.parOutbox.eventId, eventId));
            }),
          moveToDeadLetter: async (eventId, now, errorMessage) =>
            safe('withPendingBatch:moveToDeadLetter', async () => {
              const target = rows.find((r) => r.eventId === eventId);
              if (target === undefined) return;
              await tx.insert(schema.parOutboxDeadLetter).values({
                eventId: target.eventId,
                aggregateId: target.aggregateId,
                aggregateType: target.aggregateType,
                eventType: target.eventType,
                schemaVersion: target.schemaVersion,
                occurredAt: target.occurredAt,
                enqueuedAt: target.enqueuedAt,
                failedAt: now,
                attempts: target.attempts,
                lastError: errorMessage,
                payload: target.payload,
              });
              await tx.delete(schema.parOutbox).where(eq(schema.parOutbox.eventId, eventId));
            }),
        };

        return handler(rows, ops);
      });
      return ok(result);
    } catch (cause) {
      process.stderr.write(`[partners-outbox-repo:withPendingBatch] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  // ── markProcessed ─────────────────────────────────────────────────────────

  const markProcessed = async (
    eventId: string,
    now: Date,
  ): Promise<Result<void, OutboxQueryError>> => {
    return safe('markProcessed', async () => {
      // WHERE event_id = ? AND processed_at IS NULL garante idempotência:
      // se a row já foi marcada, o UPDATE não afeta nenhuma row — sem erro.
      await db
        .update(schema.parOutbox)
        .set({ processedAt: now })
        .where(and(eq(schema.parOutbox.eventId, eventId), isNull(schema.parOutbox.processedAt)));
    });
  };

  // ── markFailed ────────────────────────────────────────────────────────────

  const markFailed = async (
    eventId: string,
    now: Date,
    errorTag: string,
    attempt: number,
  ): Promise<Result<void, OutboxQueryError>> => {
    // `now`/`errorTag` não têm coluna em `par_outbox` (só na DLQ) — reservados para
    // moveToDeadLetter. Por ora marcamos apenas `attempts`.
    void now;
    void errorTag;
    return safe('markFailed', async () => {
      await db
        .update(schema.parOutbox)
        .set({ attempts: attempt })
        .where(eq(schema.parOutbox.eventId, eventId));
    });
  };

  // ── moveToDeadLetter ──────────────────────────────────────────────────────
  // INSERT DLQ + DELETE outbox numa tx. Distingue OutboxEventNotFound de erro de I/O
  // via out-param (sem `class extends Error`).

  const moveToDeadLetter = async (
    eventId: string,
    now: Date,
    errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    try {
      const txResult: [OutboxQueryError | null] = [null];

      await db.transaction(async (tx) => {
        const rows = await tx
          .select()
          .from(schema.parOutbox)
          .where(eq(schema.parOutbox.eventId, eventId))
          .for('update');

        const row = rows[0];
        if (row === undefined) {
          txResult[0] = outboxEventNotFound(eventId);
          return;
        }

        await tx.insert(schema.parOutboxDeadLetter).values({
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

        await tx.delete(schema.parOutbox).where(eq(schema.parOutbox.eventId, eventId));
      });

      const logicError = txResult[0];
      if (logicError !== null) {
        return err(logicError);
      }
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[partners-outbox-repo:moveToDeadLetter] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  return {
    append,
    withPendingBatch,
    findPendingForUpdate,
    markProcessed,
    markFailed,
    moveToDeadLetter,
  };
};
