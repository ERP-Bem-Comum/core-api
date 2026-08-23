// Adapter Drizzle do EmailOutboxPort do partners (PARTNERS-INVITE-DOMAIN-EVENT / ADR-0047) +
// auxiliares do worker (email-dispatch multi-fonte).
//
//   - append(messages) — batch INSERT em `par_email_outbox`. ER_DUP_ENTRY → tagged.
//   - appendEmailOutboxInTx(tx, schema, messages) — INSERT batch DENTRO de uma tx ja aberta
//     pelo repo do agregado (save do invite-token) — estado + outbox na MESMA tx (atomicidade —
//     ADR-0015). Lanca em erro p/ o Drizzle fazer rollback; o repo pai converte o throw em Result.
//   - withPendingBatch / findPendingForUpdate / markProcessed / markFailed / moveToDeadLetter
//     (claim POR CONSUMIDOR — molde `partners/.../outbox-repository.drizzle.ts`, #800/#824).
//     Consumo pelo worker `email-dispatch`.
//
// Claim por consumidor: a pendência de um evento não é mais `par_email_outbox.processed_at`
// (global) — é o progresso em `eventos_processados`, uma linha por par (consumidor, evento). Sob
// o desenho antigo, dois consumidores do `par_email_outbox` DIVIDIRIAM a fila; o requisito é
// fanout. Ver `#src/shared/outbox/consumer-progress.ts`.
//
// DLQ SEM tabela dedicada nesta fatia: `moveToDeadLetter` marca `dead_lettered_at` no progresso
// do consumidor (sai do pending pool DELE, preserva a row de origem para auditoria e para os
// demais consumidores). Mesma semantica no InMemory.
//
// ADR-0015 (outbox), ADR-0014 (par_*), ADR-0020 (sem JSON nativo). Boundary: try/catch → Result.

import {
  asc,
  eq,
  and,
  or,
  notExists,
  inArray,
  sql,
  isNull,
  isNotNull,
  type SQL,
} from 'drizzle-orm';
import process from 'node:process';

import { eventosProcessados } from '#src/shared/persistence/schemas/eventos-processados.ts';
import { CLAIM_ISOLATION, claimedAttempts } from '#src/shared/outbox/claim.ts';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  EmailOutboxPort,
  OutboxMessage,
  OutboxRow,
  OutboxAppendError,
  OutboxQueryError,
  OutboxBatchOps,
  OutboxFailure,
  WorkerOutboxOps,
} from '../../../application/ports/email-outbox.ts';
import {
  outboxAppendUnavailable,
  outboxAppendDuplicateEventId,
  outboxQueryUnavailable,
} from '../../../application/ports/email-outbox.ts';
import type { PartnersMysqlHandle } from '../drivers/mysql-driver.ts';
import type { NewEmailOutboxRow } from '../schemas/mysql.ts';
import * as schema from '../schemas/mysql.ts';

/** Versao canonica do contrato do payload (wire format v1). */
export const EMAIL_OUTBOX_SCHEMA_VERSION = 1;

// CA guard: trava o drift schema↔port. Se `par_email_outbox` mudar de forma, a linha inferida
// (`$inferSelect`) deixa de ser equivalente ao `OutboxRow` do port e o typecheck quebra.
type EmailOutboxRowSchema = typeof schema.parEmailOutbox.$inferSelect;
type AssertTrue<T extends true> = T;
const _emailOutboxRowDriftGuard: [
  AssertTrue<EmailOutboxRowSchema extends OutboxRow ? true : false>,
  AssertTrue<OutboxRow extends EmailOutboxRowSchema ? true : false>,
] = [true, true];
void _emailOutboxRowDriftGuard;

const messageToInsert = (message: Readonly<OutboxMessage>, now: Date): NewEmailOutboxRow => ({
  eventId: message.eventId,
  aggregateId: message.aggregateId,
  aggregateType: message.aggregateType,
  eventType: message.eventType,
  schemaVersion: EMAIL_OUTBOX_SCHEMA_VERSION,
  occurredAt: message.occurredAt,
  enqueuedAt: now,
  processedAt: null,
  attempts: 0,
  payload: message.payload,
});

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

// ─── appendEmailOutboxInTx ─────────────────────────────────────────────────────
//
// INSERT batch no email outbox DENTRO de uma transacao ja aberta pelo repo do save (invite-token).
// Garante estado + outbox na MESMA transacao (ADR-0015). `tx` tipado structuralmente como
// `{ insert: ... }` p/ aceitar `MySql2Database` ou `MySqlTransaction`.
export const appendEmailOutboxInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: { insert: PartnersMysqlHandle['db']['insert'] },
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  schemaArg: typeof schema,
  messages: readonly OutboxMessage[],
): Promise<void> => {
  if (messages.length === 0) return;
  const now = new Date();
  const inserts = messages.map((m) => messageToInsert(m, now));
  await tx.insert(schemaArg.parEmailOutbox).values(inserts);
};

// ─── safe wrapper ─────────────────────────────────────────────────────────────

const safe = async <T>(ctx: string, op: () => Promise<T>): Promise<Result<T, OutboxQueryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[par-email-outbox-repo:${ctx}] ${String(cause)}\n`);
    return err(outboxQueryUnavailable(String(cause)));
  }
};

/**
 * createDrizzleParEmailOutboxRepository — EmailOutboxPort (`append`) + auxiliares do worker p/ MySQL.
 *
 * O caminho atomico (save + evento) usa `appendEmailOutboxInTx` no repo do invite-token; este
 * `append` direto serve testes contratuais / boot sem agregado. Os helpers do worker (assinados
 * pelo contrato canonico `WorkerOutboxOps`) sao consumidos pelo `email-dispatch` — cada
 * `consumerId` enxerga TODOS os eventos, nunca uma fatia deles.
 */
export const createDrizzleParEmailOutboxRepository = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): EmailOutboxPort & WorkerOutboxOps => {
  const { db } = handle;

  // ── pendingForConsumer ────────────────────────────────────────────────────
  //
  // Tradução SQL de `isPendingForConsumer` (`shared/outbox/consumer-progress.ts`): "este
  // consumidor ainda não concluiu nem desistiu deste evento". Espelho exato do adapter do
  // `par_outbox` (`outbox-repository.drizzle.ts`) — se a regra mudar, muda nos quatro lugares.

  const pendingForConsumer = (consumerId: string): SQL | undefined =>
    // `processed_at IS NULL` primeiro — é o predicado que poda pelo índice e devolve o claim ao
    // plano `ref`. Sem ele, o `NOT EXISTS` sozinho varre e ordena o índice inteiro, travando tudo
    // que examina (medido: 100.000 linhas travadas para entregar 10). A marca vem do sweeper, não
    // do worker; atraso dele degrada a performance, nunca a correção. Ver ADR-0062 §3.
    and(
      isNull(schema.parEmailOutbox.processedAt),
      notExists(
        db
          .select({ one: sql`1` })
          .from(eventosProcessados)
          .where(
            and(
              eq(eventosProcessados.consumerId, consumerId),
              eq(eventosProcessados.eventId, schema.parEmailOutbox.eventId),
              or(
                isNotNull(eventosProcessados.processedAt),
                isNotNull(eventosProcessados.deadLetteredAt),
              ),
            ),
          ),
      ),
    );

  // ── append ──────────────────────────────────────────────────────────────────

  const append = async (
    messages: readonly OutboxMessage[],
  ): Promise<Result<void, OutboxAppendError>> => {
    if (messages.length === 0) return ok(undefined);

    const now = new Date();
    const inserts = messages.map((m) => messageToInsert(m, now));

    try {
      await db.insert(schema.parEmailOutbox).values(inserts);
      return ok(undefined);
    } catch (cause) {
      if (isDupEntry(cause)) {
        const firstId = inserts[0]?.eventId ?? 'unknown';
        return err(outboxAppendDuplicateEventId(firstId));
      }
      process.stderr.write(`[par-email-outbox-repo:append] ${String(cause)}\n`);
      return err(outboxAppendUnavailable());
    }
  };

  // ── findPendingForUpdate ──────────────────────────────────────────────────────

  const findPendingForUpdate = async (
    consumerId: string,
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> => {
    return safe('findPendingForUpdate', async () => {
      const rows = await db
        .select()
        .from(schema.parEmailOutbox)
        .where(pendingForConsumer(consumerId))
        .orderBy(asc(schema.parEmailOutbox.occurredAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      return rows as readonly OutboxRow[];
    });
  };

  // ── withPendingBatch ──────────────────────────────────────────────────────────
  // UMA transação sob READ COMMITTED (`CLAIM_ISOLATION` — sob REPEATABLE READ o `FOR UPDATE` do
  // claim trava o gap onde o produtor insere o próximo evento e estoura `1205 Lock wait timeout`;
  // ver `shared/outbox/claim.ts`), trava até `limit` rows com FOR UPDATE SKIP LOCKED, invoca
  // `handler` com as rows + ops de marcação ligadas à MESMA tx. O lock sobrevive até o COMMIT.

  const withPendingBatch = async <R>(
    consumerId: string,
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    try {
      const result = await db.transaction(async (tx) => {
        const claimed = (await tx
          .select()
          .from(schema.parEmailOutbox)
          .where(pendingForConsumer(consumerId))
          .orderBy(asc(schema.parEmailOutbox.occurredAt))
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
          // DLQ sem tabela nesta fatia: marca `dead_lettered_at` no progresso DESTE consumidor —
          // a row de origem em `par_email_outbox` segue intacta para os demais e para auditoria.
          moveToDeadLetter: async (eventId, now, errorMessage) =>
            safe('withPendingBatch:moveToDeadLetter', async () => {
              await tx
                .insert(eventosProcessados)
                .values({
                  consumerId,
                  eventId,
                  attempts: claimedAttempts(progressByEvent.get(eventId)),
                  lastError: errorMessage,
                  deadLetteredAt: now,
                })
                .onDuplicateKeyUpdate({ set: { deadLetteredAt: now, lastError: errorMessage } });
            }),
        };

        return handler(rows, ops);
      }, CLAIM_ISOLATION);
      return ok(result);
    } catch (cause) {
      process.stderr.write(`[par-email-outbox-repo:withPendingBatch] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  // ── markProcessed ────────────────────────────────────────────────────────────
  // Idempotência pela PK (consumer_id, event_id). A linha do `par_email_outbox` não é tocada:
  // marcá-la declararia o evento resolvido para TODOS os consumidores — o defeito de #800/#824.

  const markProcessed = async (
    consumerId: string,
    eventId: string,
    now: Date,
  ): Promise<Result<void, OutboxQueryError>> => {
    return safe('markProcessed', async () => {
      await db
        .insert(eventosProcessados)
        .values({ consumerId, eventId, processedAt: now, attempts: 0 })
        .onDuplicateKeyUpdate({ set: { processedAt: now } });
    });
  };

  // ── markFailed ────────────────────────────────────────────────────────────────
  // Orçamento de retry por consumidor: antes, em `par_email_outbox.attempts` global, a falha de
  // um gastava as tentativas do outro.

  const markFailed = async (
    consumerId: string,
    eventId: string,
    // `now` não é desestruturado: não há coluna de "hora da última falha" em `par_email_outbox`.
    { errorTag, attempt }: OutboxFailure,
  ): Promise<Result<void, OutboxQueryError>> => {
    return safe('markFailed', async () => {
      await db
        .insert(eventosProcessados)
        .values({ consumerId, eventId, attempts: attempt, lastError: errorTag })
        .onDuplicateKeyUpdate({ set: { attempts: attempt, lastError: errorTag } });
    });
  };

  // ── moveToDeadLetter ────────────────────────────────────────────────────────────
  // SEM tabela DLQ nesta fatia: marca `dead_lettered_at` no progresso DESTE consumidor — a row
  // de origem em `par_email_outbox` segue intacta para os demais consumidores e para auditoria.

  const moveToDeadLetter = async (
    consumerId: string,
    eventId: string,
    now: Date,
    errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    return safe('moveToDeadLetter', async () => {
      const progress = await db
        .select()
        .from(eventosProcessados)
        .where(
          and(
            eq(eventosProcessados.consumerId, consumerId),
            eq(eventosProcessados.eventId, eventId),
          ),
        );
      await db
        .insert(eventosProcessados)
        .values({
          consumerId,
          eventId,
          attempts: claimedAttempts(progress[0]),
          lastError: errorMessage,
          deadLetteredAt: now,
        })
        .onDuplicateKeyUpdate({ set: { deadLetteredAt: now, lastError: errorMessage } });
    });
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
