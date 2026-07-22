// Reader do `fin_outbox` para o worker genérico (#307) — o financial nunca teve consumidor do
// próprio outbox (`fin-outbox-helpers.ts` é produtor-apenas). Implementa `WorkerOutboxOps`
// (claim ordenado + markProcessed idempotente + DLQ), mirror de
// `contracts/.../outbox-repository.drizzle.ts` sobre `finOutbox`/`finOutboxDeadLetter`.
//
// FIFO por agregado (ADR-0015): claim `WHERE processed_at IS NULL ORDER BY processed_at, occurred_at
// FOR UPDATE SKIP LOCKED` — sob consumidor único, eventos do mesmo documento são processados em
// ordem de ocorrência (garante DocumentSaved antes das transições de status). Boundary: todo
// try/catch converte para `Result` (.claude/rules/adapters.md).

import { isNull, asc, eq, and } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import {
  type WorkerOutboxOps,
  type OutboxRow,
  type OutboxBatchOps,
  type OutboxQueryError,
  outboxQueryUnavailable,
  outboxEventNotFound,
} from '#src/shared/outbox/index.ts';
import type { FinancialMysqlHandle } from '#src/modules/financial/adapters/persistence/drivers/mysql-driver.ts';
import { finOutbox, finOutboxDeadLetter } from '../schemas/mysql.ts';

const safe = async <T>(ctx: string, op: () => Promise<T>): Promise<Result<T, OutboxQueryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[fin-outbox-reader:${ctx}] ${String(cause)}\n`);
    return err(outboxQueryUnavailable(String(cause)));
  }
};

export const createDrizzleFinancialOutboxReader = (
  handle: FinancialMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): WorkerOutboxOps => {
  const { db } = handle;

  const findPendingForUpdate = async (
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> =>
    safe('findPendingForUpdate', async () => {
      const rows = await db
        .select()
        .from(finOutbox)
        .where(isNull(finOutbox.processedAt))
        .orderBy(asc(finOutbox.processedAt), asc(finOutbox.occurredAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      return rows as readonly OutboxRow[];
    });

  const markProcessed = async (
    eventId: string,
    now: Date,
  ): Promise<Result<void, OutboxQueryError>> =>
    // WHERE processed_at IS NULL → idempotente (2ª chamada = 0 rows affected = OK).
    safe('markProcessed', async () => {
      await db
        .update(finOutbox)
        .set({ processedAt: now })
        .where(and(eq(finOutbox.eventId, eventId), isNull(finOutbox.processedAt)));
    });

  const markFailed = async (
    eventId: string,
    _now: Date,
    _errorTag: string,
    attempt: number,
  ): Promise<Result<void, OutboxQueryError>> =>
    // `fin_outbox` não tem last_error/last_failed_at (só a DLQ) — marca apenas attempts.
    safe('markFailed', async () => {
      await db.update(finOutbox).set({ attempts: attempt }).where(eq(finOutbox.eventId, eventId));
    });

  // Move `fin_outbox` → `fin_outbox_dead_letter` numa transação. Out-param transporta o erro
  // lógico (not-found) sem abortar a tx nem usar `class extends Error` (ESLint proíbe class).
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
          .from(finOutbox)
          .where(eq(finOutbox.eventId, eventId))
          .for('update');
        const row = rows[0];
        if (row === undefined) {
          txResult[0] = outboxEventNotFound(eventId);
          return;
        }
        await tx.insert(finOutboxDeadLetter).values({
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
        await tx.delete(finOutbox).where(eq(finOutbox.eventId, eventId));
      });
      const logicError = txResult[0];
      if (logicError !== null) return err(logicError);
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[fin-outbox-reader:moveToDeadLetter] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  // Consumo concorrente-seguro: UMA transação, claim FOR UPDATE SKIP LOCKED até `limit`, e as ops
  // de marcação ligadas à MESMA tx (o lock sobrevive até o COMMIT — particiona entre workers).
  const withPendingBatch = async <R>(
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    try {
      const result = await db.transaction(async (tx) => {
        const rows = (await tx
          .select()
          .from(finOutbox)
          .where(isNull(finOutbox.processedAt))
          .orderBy(asc(finOutbox.processedAt), asc(finOutbox.occurredAt))
          .limit(limit)
          .for('update', { skipLocked: true })) as readonly OutboxRow[];

        const ops: OutboxBatchOps = {
          markProcessed: async (id, at) =>
            safe('withPendingBatch:markProcessed', async () => {
              await tx
                .update(finOutbox)
                .set({ processedAt: at })
                .where(and(eq(finOutbox.eventId, id), isNull(finOutbox.processedAt)));
            }),
          markFailed: async (id, _at, _tag, attempt) =>
            safe('withPendingBatch:markFailed', async () => {
              await tx
                .update(finOutbox)
                .set({ attempts: attempt })
                .where(eq(finOutbox.eventId, id));
            }),
          moveToDeadLetter: async (id, at, message) =>
            safe('withPendingBatch:moveToDeadLetter', async () => {
              const target = rows.find((r) => r.eventId === id);
              if (target === undefined) return;
              await tx.insert(finOutboxDeadLetter).values({
                eventId: target.eventId,
                aggregateId: target.aggregateId,
                aggregateType: target.aggregateType,
                eventType: target.eventType,
                schemaVersion: target.schemaVersion,
                occurredAt: target.occurredAt,
                enqueuedAt: target.enqueuedAt,
                failedAt: at,
                attempts: target.attempts,
                lastError: message,
                payload: target.payload,
              });
              await tx.delete(finOutbox).where(eq(finOutbox.eventId, id));
            }),
        };

        return handler(rows, ops);
      });
      return ok(result);
    } catch (cause) {
      process.stderr.write(`[fin-outbox-reader:withPendingBatch] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  return { withPendingBatch, findPendingForUpdate, markProcessed, markFailed, moveToDeadLetter };
};
