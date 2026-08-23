// Reader do `fin_outbox` para o worker genérico (#307) — o financial nunca teve consumidor do
// próprio outbox (`fin-outbox-helpers.ts` é produtor-apenas). Implementa `WorkerOutboxOps`
// (claim por consumidor + markProcessed idempotente + DLQ), mirror de
// `partners/.../outbox-repository.drizzle.ts` sobre `finOutbox`/`finOutboxDeadLetter`.
//
// Claim POR CONSUMIDOR (#800, #824): a pendência de um evento não é mais a coluna global
// `processed_at` da própria linha — é o progresso em `eventos_processados` (uma linha por par
// consumidor/evento). Sob o desenho antigo, dois consumidores do `fin_outbox` DIVIDIRIAM a fila
// (`FOR UPDATE SKIP LOCKED` sobre `processed_at IS NULL`); o requisito é fanout — cada um recebe
// TODOS os eventos. Ver `#src/shared/outbox/consumer-progress.ts` para o predicado canônico.
//
// Boundary: todo try/catch converte para `Result` (.claude/rules/adapters.md).

import { asc, eq, and, or, notExists, inArray, sql, isNotNull, type SQL } from 'drizzle-orm';
import process from 'node:process';

import { eventosProcessados } from '#src/shared/persistence/schemas/eventos-processados.ts';
import { CLAIM_ISOLATION, claimedAttempts } from '#src/shared/outbox/claim.ts';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import {
  type WorkerOutboxOps,
  type OutboxRow,
  type OutboxBatchOps,
  type OutboxQueryError,
  type OutboxFailure,
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

  // ── pendingForConsumer ────────────────────────────────────────────────────
  //
  // Tradução SQL de `isPendingForConsumer` (`shared/outbox/consumer-progress.ts`): "este
  // consumidor ainda não concluiu nem desistiu deste evento". Espelho exato do adapter do
  // `partners` — se a regra mudar, muda nos quatro lugares (predicado, e os três adapters).

  const pendingForConsumer = (consumerId: string): SQL =>
    notExists(
      db
        .select({ one: sql`1` })
        .from(eventosProcessados)
        .where(
          and(
            eq(eventosProcessados.consumerId, consumerId),
            eq(eventosProcessados.eventId, finOutbox.eventId),
            or(
              isNotNull(eventosProcessados.processedAt),
              isNotNull(eventosProcessados.deadLetteredAt),
            ),
          ),
        ),
    );

  // ── findPendingForUpdate ──────────────────────────────────────────────────

  const findPendingForUpdate = async (
    consumerId: string,
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> =>
    safe('findPendingForUpdate', async () => {
      const rows = await db
        .select()
        .from(finOutbox)
        .where(pendingForConsumer(consumerId))
        .orderBy(asc(finOutbox.occurredAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      return rows as readonly OutboxRow[];
    });

  // ── markProcessed ─────────────────────────────────────────────────────────

  const markProcessed = async (
    consumerId: string,
    eventId: string,
    now: Date,
  ): Promise<Result<void, OutboxQueryError>> =>
    // Idempotência pela PK (consumer_id, event_id). A linha do `fin_outbox` não é tocada: marcá-la
    // declararia o evento resolvido para TODOS os consumidores — o defeito de #800/#824.
    safe('markProcessed', async () => {
      await db
        .insert(eventosProcessados)
        .values({ consumerId, eventId, processedAt: now, attempts: 0 })
        .onDuplicateKeyUpdate({ set: { processedAt: now } });
    });

  // ── markFailed ────────────────────────────────────────────────────────────

  const markFailed = async (
    consumerId: string,
    eventId: string,
    // `now` não é desestruturado: `fin_outbox` não tem coluna de "hora da última falha".
    { errorTag, attempt }: OutboxFailure,
  ): Promise<Result<void, OutboxQueryError>> =>
    // Orçamento de retry por consumidor: antes, em `fin_outbox.attempts` global, a falha de um
    // gastava as tentativas do outro.
    safe('markFailed', async () => {
      await db
        .insert(eventosProcessados)
        .values({ consumerId, eventId, attempts: attempt, lastError: errorTag })
        .onDuplicateKeyUpdate({ set: { attempts: attempt, lastError: errorTag } });
    });

  // ── moveToDeadLetter ──────────────────────────────────────────────────────
  // INSERT DLQ (SEM DELETE do `fin_outbox` — ver nota abaixo) + marcação do progresso, numa tx.
  // Out-param transporta o erro lógico (not-found) sem abortar a tx nem usar `class extends Error`.

  const moveToDeadLetter = async (
    consumerId: string,
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

        // Tentativas DESTE consumidor — a coluna global contaria as falhas de qualquer um.
        const progress = await tx
          .select()
          .from(eventosProcessados)
          .where(
            and(
              eq(eventosProcessados.consumerId, consumerId),
              eq(eventosProcessados.eventId, eventId),
            ),
          );

        await tx
          .insert(finOutboxDeadLetter)
          .values({
            // `fin_outbox_dead_letter` já tem PK composta (consumer_id, event_id) — a desistência
            // é de UM consumidor, não do evento (#800, #824).
            consumerId,
            eventId: row.eventId,
            aggregateId: row.aggregateId,
            aggregateType: row.aggregateType,
            eventType: row.eventType,
            schemaVersion: row.schemaVersion,
            occurredAt: row.occurredAt,
            enqueuedAt: row.enqueuedAt,
            failedAt: now,
            attempts: claimedAttempts(progress[0]),
            lastError: errorMessage,
            payload: row.payload,
          })
          .onDuplicateKeyUpdate({ set: { failedAt: now, lastError: errorMessage } });

        await tx
          .insert(eventosProcessados)
          .values({
            consumerId,
            eventId,
            attempts: claimedAttempts(progress[0]),
            lastError: errorMessage,
            deadLetteredAt: now,
          })
          .onDuplicateKeyUpdate({ set: { deadLetteredAt: now, lastError: errorMessage } });

        // ⚠️ Sem DELETE em `fin_outbox` — ADR-0022:27-29 ("o outbox RETÉM as entradas após a
        // entrega… NÃO deleta"). Apagar a origem roubaria o evento dos demais consumidores.
      });

      const logicError = txResult[0];
      if (logicError !== null) return err(logicError);
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[fin-outbox-reader:moveToDeadLetter] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  // ── withPendingBatch ──────────────────────────────────────────────────────
  // Consumo concorrente correto: abre UMA transação sob READ COMMITTED (`CLAIM_ISOLATION` —
  // sob REPEATABLE READ o `FOR UPDATE` do claim trava o gap onde o produtor insere o próximo
  // evento e estoura `1205 Lock wait timeout`; ver `shared/outbox/claim.ts`), trava até `limit`
  // rows com FOR UPDATE SKIP LOCKED, e invoca `handler` com as rows + ops de marcação ligadas à
  // MESMA transação (tx). O lock sobrevive até o COMMIT.

  const withPendingBatch = async <R>(
    consumerId: string,
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    try {
      const result = await db.transaction(async (tx) => {
        const claimed = (await tx
          .select()
          .from(finOutbox)
          .where(pendingForConsumer(consumerId))
          .orderBy(asc(finOutbox.occurredAt))
          .limit(limit)
          .for('update', { skipLocked: true })) as readonly OutboxRow[];

        // `attempts` DESTE consumidor. Segunda query em vez de JOIN: o Drizzle não expõe
        // `FOR UPDATE OF <tabela>`, e um JOIN sob o claim travaria `eventos_processados` junto.
        const claimedIds = claimed.map((r) => r.eventId);
        const progresses =
          claimedIds.length === 0
            ? []
            : await tx
                .select()
                .from(eventosProcessados)
                .where(
                  and(
                    eq(eventosProcessados.consumerId, consumerId),
                    inArray(eventosProcessados.eventId, claimedIds),
                  ),
                );
        const progressByEvent = new Map(progresses.map((p) => [p.eventId, p]));
        const rows: readonly OutboxRow[] = claimed.map((r) => ({
          ...r,
          attempts: claimedAttempts(progressByEvent.get(r.eventId)),
        }));

        const ops: OutboxBatchOps = {
          markProcessed: async (id, at) =>
            safe('withPendingBatch:markProcessed', async () => {
              await tx
                .insert(eventosProcessados)
                .values({ consumerId, eventId: id, processedAt: at, attempts: 0 })
                .onDuplicateKeyUpdate({ set: { processedAt: at } });
            }),
          markFailed: async (id, { errorTag, attempt }) =>
            safe('withPendingBatch:markFailed', async () => {
              await tx
                .insert(eventosProcessados)
                .values({ consumerId, eventId: id, attempts: attempt, lastError: errorTag })
                .onDuplicateKeyUpdate({ set: { attempts: attempt, lastError: errorTag } });
            }),
          moveToDeadLetter: async (id, at, message) =>
            safe('withPendingBatch:moveToDeadLetter', async () => {
              const target = rows.find((r) => r.eventId === id);
              if (target === undefined) return;
              await tx
                .insert(finOutboxDeadLetter)
                .values({
                  // `fin_outbox_dead_letter` já tem PK composta (consumer_id, event_id).
                  consumerId,
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
                })
                .onDuplicateKeyUpdate({ set: { failedAt: at, lastError: message } });
              await tx
                .insert(eventosProcessados)
                .values({
                  consumerId,
                  eventId: id,
                  attempts: target.attempts,
                  lastError: message,
                  deadLetteredAt: at,
                })
                .onDuplicateKeyUpdate({ set: { deadLetteredAt: at, lastError: message } });
              // ⚠️ Sem DELETE em `fin_outbox` — mesma nota de `moveToDeadLetter` acima.
            }),
        };

        return handler(rows, ops);
      }, CLAIM_ISOLATION);
      return ok(result);
    } catch (cause) {
      process.stderr.write(`[fin-outbox-reader:withPendingBatch] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  return { withPendingBatch, findPendingForUpdate, markProcessed, markFailed, moveToDeadLetter };
};
