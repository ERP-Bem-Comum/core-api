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

import {
  isNull,
  isNotNull,
  asc,
  eq,
  and,
  or,
  notExists,
  inArray,
  sql,
  type SQL,
} from 'drizzle-orm';
import process from 'node:process';

import { eventosProcessados } from '#src/shared/persistence/schemas/eventos-processados.ts';
import { CLAIM_ISOLATION, claimedAttempts } from '#src/shared/outbox/claim.ts';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  OutboxPort,
  OutboxMessage,
  OutboxRow,
  OutboxAppendError,
  OutboxQueryError,
  OutboxBatchOps,
  OutboxFailure,
  WorkerOutboxOps,
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
  // Assinado pelo contrato canônico (`shared/outbox/types.ts`) em vez da lista repetida à mão —
  // é o compilador que passa a cobrar o `consumerId` em cada operação, nos dois módulos.
): OutboxPort & WorkerOutboxOps => {
  const { db } = handle;

  // ── pendingForConsumer ────────────────────────────────────────────────────
  //
  // Tradução SQL de `isPendingForConsumer` (`shared/outbox/consumer-progress.ts`): "este
  // consumidor ainda não concluiu nem desistiu deste evento". Espelho exato do adapter do
  // ⚠️ Se a regra mudar, muda em SEIS lugares: o predicado canônico
  // (`shared/outbox/consumer-progress.ts`) e os cinco adapters que o traduzem em SQL — `contracts`,
  // `partners` (aqui), `partners/email-outbox`, `auth` e `financial`. Este comentário já disse
  // "três" e subcontava em dois; ele é a única defesa contra uma tradução ficar para trás, e
  // esquecer o `isNotNull(deadLetteredAt)` em uma delas faz um evento em DLQ ser reprocessado
  // para sempre.

  // `SQL | undefined` em vez de cast — `.where()` aceita, é o idioma do repositório, e evita a
  // contradição entre `non-nullable-type-assertion-style` (pede `!`) e `no-non-null-assertion`.
  const pendingForConsumer = (consumerId: string): SQL | undefined =>
    // `processed_at IS NULL` primeiro — é o predicado que poda pelo índice e devolve o claim ao
    // plano `ref`. Sem ele, o `NOT EXISTS` sozinho varre e ordena o índice inteiro, travando tudo
    // que examina (medido: 100.000 linhas travadas para entregar 10). A marca vem do sweeper, não
    // do worker; atraso dele degrada a performance, nunca a correção. Ver ADR-0064 §3.
    and(
      isNull(schema.parOutbox.processedAt),
      notExists(
        db
          .select({ one: sql`1` })
          .from(eventosProcessados)
          .where(
            and(
              eq(eventosProcessados.consumerId, consumerId),
              eq(eventosProcessados.eventId, schema.parOutbox.eventId),
              or(
                isNotNull(eventosProcessados.processedAt),
                isNotNull(eventosProcessados.deadLetteredAt),
              ),
            ),
          ),
      ),
    );

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
    consumerId: string,
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> => {
    return safe('findPendingForUpdate', async () => {
      const rows = await db
        .select()
        .from(schema.parOutbox)
        .where(pendingForConsumer(consumerId))
        .orderBy(asc(schema.parOutbox.occurredAt))
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
    consumerId: string,
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    try {
      const result = await db.transaction(async (tx) => {
        const claimed = (await tx
          .select()
          .from(schema.parOutbox)
          .where(pendingForConsumer(consumerId))
          .orderBy(asc(schema.parOutbox.occurredAt))
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
          markProcessed: async (eventId, now) =>
            safe('withPendingBatch:markProcessed', async () => {
              await tx
                .insert(eventosProcessados)
                .values({ consumerId, eventId, processedAt: now, attempts: 0 })
                .onDuplicateKeyUpdate({ set: { processedAt: now } });
            }),
          markFailed: async (eventId, { errorTag, attempt }) =>
            safe('withPendingBatch:markFailed', async () => {
              await tx
                .insert(eventosProcessados)
                .values({ consumerId, eventId, attempts: attempt, lastError: errorTag })
                .onDuplicateKeyUpdate({ set: { attempts: attempt, lastError: errorTag } });
            }),
          moveToDeadLetter: async (eventId, now, errorMessage) =>
            safe('withPendingBatch:moveToDeadLetter', async () => {
              const target = rows.find((r) => r.eventId === eventId);
              if (target === undefined) return;
              await tx
                .insert(schema.parOutboxDeadLetter)
                .values({
                  consumerId,
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
                })
                .onDuplicateKeyUpdate({ set: { failedAt: now, lastError: errorMessage } });
              await tx
                .insert(eventosProcessados)
                .values({
                  consumerId,
                  eventId,
                  attempts: target.attempts,
                  lastError: errorMessage,
                  deadLetteredAt: now,
                })
                .onDuplicateKeyUpdate({ set: { deadLetteredAt: now, lastError: errorMessage } });
              // ⚠️ Sem DELETE na origem: a desistência de um consumidor não apaga o evento dos
              // demais, e o ADR-0022:27-29 exige que o outbox retenha a entrada.
            }),
        };

        return handler(rows, ops);
      }, CLAIM_ISOLATION);
      return ok(result);
    } catch (cause) {
      process.stderr.write(`[partners-outbox-repo:withPendingBatch] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  // ── markProcessed ─────────────────────────────────────────────────────────

  const markProcessed = async (
    consumerId: string,
    eventId: string,
    now: Date,
  ): Promise<Result<void, OutboxQueryError>> => {
    return safe('markProcessed', async () => {
      // Idempotência pela PK (consumer_id, event_id). A linha do outbox não é tocada: marcá-la
      // declararia o evento resolvido para TODOS os consumidores — o defeito de #800/#824.
      await db
        .insert(eventosProcessados)
        .values({ consumerId, eventId, processedAt: now, attempts: 0 })
        .onDuplicateKeyUpdate({ set: { processedAt: now } });
    });
  };

  // ── markFailed ────────────────────────────────────────────────────────────

  const markFailed = async (
    consumerId: string,
    eventId: string,
    // `now` não é desestruturado: não há coluna de "hora da última falha". `errorTag` agora tem
    // onde morar (`last_error`).
    { errorTag, attempt }: OutboxFailure,
  ): Promise<Result<void, OutboxQueryError>> => {
    return safe('markFailed', async () => {
      // Orçamento de retry por consumidor: antes, em `par_outbox.attempts` global, a falha de um
      // gastava as tentativas do outro.
      await db
        .insert(eventosProcessados)
        .values({ consumerId, eventId, attempts: attempt, lastError: errorTag })
        .onDuplicateKeyUpdate({ set: { attempts: attempt, lastError: errorTag } });
    });
  };

  // ── moveToDeadLetter ──────────────────────────────────────────────────────
  // INSERT DLQ + DELETE outbox numa tx. Distingue OutboxEventNotFound de erro de I/O
  // via out-param (sem `class extends Error`).

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
          .from(schema.parOutbox)
          .where(eq(schema.parOutbox.eventId, eventId))
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
          .insert(schema.parOutboxDeadLetter)
          .values({
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

        // ⚠️ Sem DELETE na origem — ADR-0022:27-29. Ver a nota em `withPendingBatch`.
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
