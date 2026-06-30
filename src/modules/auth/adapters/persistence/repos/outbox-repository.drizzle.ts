// Adapter Drizzle do OutboxPort do auth (AUTH-DOMAIN-OUTBOX / ADR-0047) + auxiliares do worker
// (NOTIF-EMAIL-EVENT-CONSUMER, fatia 02).
//
//   - append(messages) — batch INSERT em `auth_outbox`. ER_DUP_ENTRY → tagged.
//   - appendOutboxInTx(tx, schema, messages) — INSERT batch DENTRO de uma tx ja aberta
//     pelo repo do agregado (save do reset/invite-token) — estado + outbox na MESMA tx
//     (atomicidade — ADR-0015). Lanca em erro p/ o Drizzle fazer rollback; o repo pai
//     converte o throw em Result na borda.
//   - withPendingBatch / findPendingForUpdate / markProcessed / markFailed / moveToDeadLetter
//     (claim com FOR UPDATE SKIP LOCKED — molde partners). Consumo pelo worker `email-dispatch`.
//
// DLQ SEM tabela dedicada nesta fatia: `moveToDeadLetter` marca `processed_at` (sai do pending
// pool, preserva a row para auditoria) — `auth_outbox_dead_letter` e diferido (exigiria migration
// destrutiva/CREATE; recorte liga+desliga nao gera migration). Mesma semantica no InMemory.
//
// ADR-0015 (outbox), ADR-0014 (auth_*), ADR-0020 (sem JSON nativo). Boundary: try/catch → Result.

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
} from '../../../application/ports/outbox.ts';
import {
  outboxAppendUnavailable,
  outboxAppendDuplicateEventId,
  outboxQueryUnavailable,
} from '../../../application/ports/outbox.ts';
import type { AuthMysqlHandle } from '../drivers/mysql-driver.ts';
import type { NewOutboxRow } from '../schemas/mysql.ts';
import * as schema from '../schemas/mysql.ts';

/** Versao canonica do contrato do payload (wire format v1). */
export const OUTBOX_SCHEMA_VERSION = 1;

// CA guard: trava o drift schema↔port. Se `auth_outbox` mudar de forma, a linha
// inferida (`$inferSelect`) deixa de ser equivalente ao `OutboxRow` do port e o typecheck quebra.
type OutboxRowSchema = typeof schema.authOutbox.$inferSelect;
type AssertTrue<T extends true> = T;
const _outboxRowDriftGuard: [
  AssertTrue<OutboxRowSchema extends OutboxRow ? true : false>,
  AssertTrue<OutboxRow extends OutboxRowSchema ? true : false>,
] = [true, true];
void _outboxRowDriftGuard;

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
// INSERT batch no outbox DENTRO de uma transacao ja aberta pelo repo do save
// (reset/invite-token). Garante estado + outbox na MESMA transacao (ADR-0015).
// `tx` tipado structuralmente como `{ insert: ... }` p/ aceitar `MySql2Database` ou `MySqlTransaction`.
export const appendOutboxInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: { insert: AuthMysqlHandle['db']['insert'] },
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  schemaArg: typeof schema,
  messages: readonly OutboxMessage[],
): Promise<void> => {
  if (messages.length === 0) return;
  const now = new Date();
  const inserts = messages.map((m) => messageToInsert(m, now));
  await tx.insert(schemaArg.authOutbox).values(inserts);
};

// ─── safe wrapper ─────────────────────────────────────────────────────────────

const safe = async <T>(ctx: string, op: () => Promise<T>): Promise<Result<T, OutboxQueryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[auth-outbox-repo:${ctx}] ${String(cause)}\n`);
    return err(outboxQueryUnavailable(String(cause)));
  }
};

/**
 * createDrizzleAuthOutboxRepository — OutboxPort (`append`) + auxiliares do worker para MySQL.
 *
 * O caminho atomico (save + evento) usa `appendOutboxInTx` no repo do token; este `append`
 * direto serve testes contratuais / boot sem agregado. Os helpers do worker sao consumidos
 * pelo `email-dispatch` (claim FOR UPDATE SKIP LOCKED).
 */
export const createDrizzleAuthOutboxRepository = (
  handle: AuthMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
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

  // ── append ──────────────────────────────────────────────────────────────────

  const append = async (
    messages: readonly OutboxMessage[],
  ): Promise<Result<void, OutboxAppendError>> => {
    if (messages.length === 0) return ok(undefined);

    const now = new Date();
    const inserts = messages.map((m) => messageToInsert(m, now));

    try {
      await db.insert(schema.authOutbox).values(inserts);
      return ok(undefined);
    } catch (cause) {
      if (isDupEntry(cause)) {
        const firstId = inserts[0]?.eventId ?? 'unknown';
        return err(outboxAppendDuplicateEventId(firstId));
      }
      process.stderr.write(`[auth-outbox-repo:append] ${String(cause)}\n`);
      return err(outboxAppendUnavailable());
    }
  };

  // ── findPendingForUpdate ──────────────────────────────────────────────────────

  const findPendingForUpdate = async (
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> => {
    return safe('findPendingForUpdate', async () => {
      const rows = await db
        .select()
        .from(schema.authOutbox)
        .where(isNull(schema.authOutbox.processedAt))
        .orderBy(asc(schema.authOutbox.processedAt), asc(schema.authOutbox.occurredAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      return rows as readonly OutboxRow[];
    });
  };

  // ── withPendingBatch ──────────────────────────────────────────────────────────
  // UMA transacao: trava ate `limit` rows com FOR UPDATE SKIP LOCKED, invoca `handler`
  // com as rows + ops de marcacao ligadas a MESMA tx. O lock sobrevive ate o COMMIT.

  const withPendingBatch = async <R>(
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    try {
      const result = await db.transaction(async (tx) => {
        const rows = (await tx
          .select()
          .from(schema.authOutbox)
          .where(isNull(schema.authOutbox.processedAt))
          .orderBy(asc(schema.authOutbox.processedAt), asc(schema.authOutbox.occurredAt))
          .limit(limit)
          .for('update', { skipLocked: true })) as readonly OutboxRow[];

        const ops: OutboxBatchOps = {
          markProcessed: async (eventId, now) =>
            safe('withPendingBatch:markProcessed', async () => {
              await tx
                .update(schema.authOutbox)
                .set({ processedAt: now })
                .where(
                  and(
                    eq(schema.authOutbox.eventId, eventId),
                    isNull(schema.authOutbox.processedAt),
                  ),
                );
            }),
          markFailed: async (eventId, _now, _errorTag, attempt) =>
            safe('withPendingBatch:markFailed', async () => {
              await tx
                .update(schema.authOutbox)
                .set({ attempts: attempt })
                .where(eq(schema.authOutbox.eventId, eventId));
            }),
          // DLQ sem tabela: marca processed (sai do pending), preserva a row para auditoria.
          moveToDeadLetter: async (eventId, now, _errorMessage) =>
            safe('withPendingBatch:moveToDeadLetter', async () => {
              await tx
                .update(schema.authOutbox)
                .set({ processedAt: now })
                .where(
                  and(
                    eq(schema.authOutbox.eventId, eventId),
                    isNull(schema.authOutbox.processedAt),
                  ),
                );
            }),
        };

        return handler(rows, ops);
      });
      return ok(result);
    } catch (cause) {
      process.stderr.write(`[auth-outbox-repo:withPendingBatch] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  // ── markProcessed (idempotente via WHERE processed_at IS NULL) ─────────────────

  const markProcessed = async (
    eventId: string,
    now: Date,
  ): Promise<Result<void, OutboxQueryError>> => {
    return safe('markProcessed', async () => {
      await db
        .update(schema.authOutbox)
        .set({ processedAt: now })
        .where(and(eq(schema.authOutbox.eventId, eventId), isNull(schema.authOutbox.processedAt)));
    });
  };

  // ── markFailed ────────────────────────────────────────────────────────────────

  const markFailed = async (
    eventId: string,
    now: Date,
    errorTag: string,
    attempt: number,
  ): Promise<Result<void, OutboxQueryError>> => {
    // `now`/`errorTag` reservados para a futura DLQ; por ora marcamos apenas `attempts`.
    void now;
    void errorTag;
    return safe('markFailed', async () => {
      await db
        .update(schema.authOutbox)
        .set({ attempts: attempt })
        .where(eq(schema.authOutbox.eventId, eventId));
    });
  };

  // ── moveToDeadLetter ──────────────────────────────────────────────────────────
  // SEM tabela DLQ nesta fatia: marca processed (sai do pending), preserva a row para auditoria.

  const moveToDeadLetter = async (
    eventId: string,
    now: Date,
    _errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    return safe('moveToDeadLetter', async () => {
      await db
        .update(schema.authOutbox)
        .set({ processedAt: now })
        .where(and(eq(schema.authOutbox.eventId, eventId), isNull(schema.authOutbox.processedAt)));
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
