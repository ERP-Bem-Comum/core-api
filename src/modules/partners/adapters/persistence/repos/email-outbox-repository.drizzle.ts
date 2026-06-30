// Adapter Drizzle do EmailOutboxPort do partners (PARTNERS-INVITE-DOMAIN-EVENT / ADR-0047) +
// auxiliares do worker (email-dispatch multi-fonte).
//
//   - append(messages) — batch INSERT em `par_email_outbox`. ER_DUP_ENTRY → tagged.
//   - appendEmailOutboxInTx(tx, schema, messages) — INSERT batch DENTRO de uma tx ja aberta
//     pelo repo do agregado (save do invite-token) — estado + outbox na MESMA tx (atomicidade —
//     ADR-0015). Lanca em erro p/ o Drizzle fazer rollback; o repo pai converte o throw em Result.
//   - withPendingBatch / findPendingForUpdate / markProcessed / markFailed / moveToDeadLetter
//     (claim com FOR UPDATE SKIP LOCKED — molde auth/partners). Consumo pelo worker `email-dispatch`.
//
// DLQ SEM tabela dedicada nesta fatia: `moveToDeadLetter` marca `processed_at` (sai do pending pool,
// preserva a row para auditoria). Mesma semantica no InMemory.
//
// ADR-0015 (outbox), ADR-0014 (par_*), ADR-0020 (sem JSON nativo). Boundary: try/catch → Result.

import { isNull, asc, eq, and } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  EmailOutboxPort,
  OutboxMessage,
  OutboxRow,
  OutboxAppendError,
  OutboxQueryError,
  OutboxBatchOps,
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
 * `append` direto serve testes contratuais / boot sem agregado. Os helpers do worker sao consumidos
 * pelo `email-dispatch` (claim FOR UPDATE SKIP LOCKED).
 */
export const createDrizzleParEmailOutboxRepository = (
  handle: PartnersMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): EmailOutboxPort & {
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
    limit: number,
  ): Promise<Result<readonly OutboxRow[], OutboxQueryError>> => {
    return safe('findPendingForUpdate', async () => {
      const rows = await db
        .select()
        .from(schema.parEmailOutbox)
        .where(isNull(schema.parEmailOutbox.processedAt))
        .orderBy(asc(schema.parEmailOutbox.processedAt), asc(schema.parEmailOutbox.occurredAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      return rows as readonly OutboxRow[];
    });
  };

  // ── withPendingBatch ──────────────────────────────────────────────────────────

  const withPendingBatch = async <R>(
    limit: number,
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    try {
      const result = await db.transaction(async (tx) => {
        const rows = (await tx
          .select()
          .from(schema.parEmailOutbox)
          .where(isNull(schema.parEmailOutbox.processedAt))
          .orderBy(asc(schema.parEmailOutbox.processedAt), asc(schema.parEmailOutbox.occurredAt))
          .limit(limit)
          .for('update', { skipLocked: true })) as readonly OutboxRow[];

        const ops: OutboxBatchOps = {
          markProcessed: async (eventId, now) =>
            safe('withPendingBatch:markProcessed', async () => {
              await tx
                .update(schema.parEmailOutbox)
                .set({ processedAt: now })
                .where(
                  and(
                    eq(schema.parEmailOutbox.eventId, eventId),
                    isNull(schema.parEmailOutbox.processedAt),
                  ),
                );
            }),
          markFailed: async (eventId, _now, _errorTag, attempt) =>
            safe('withPendingBatch:markFailed', async () => {
              await tx
                .update(schema.parEmailOutbox)
                .set({ attempts: attempt })
                .where(eq(schema.parEmailOutbox.eventId, eventId));
            }),
          moveToDeadLetter: async (eventId, now, _errorMessage) =>
            safe('withPendingBatch:moveToDeadLetter', async () => {
              await tx
                .update(schema.parEmailOutbox)
                .set({ processedAt: now })
                .where(
                  and(
                    eq(schema.parEmailOutbox.eventId, eventId),
                    isNull(schema.parEmailOutbox.processedAt),
                  ),
                );
            }),
        };

        return handler(rows, ops);
      });
      return ok(result);
    } catch (cause) {
      process.stderr.write(`[par-email-outbox-repo:withPendingBatch] ${String(cause)}\n`);
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
        .update(schema.parEmailOutbox)
        .set({ processedAt: now })
        .where(
          and(
            eq(schema.parEmailOutbox.eventId, eventId),
            isNull(schema.parEmailOutbox.processedAt),
          ),
        );
    });
  };

  // ── markFailed ────────────────────────────────────────────────────────────────

  const markFailed = async (
    eventId: string,
    now: Date,
    errorTag: string,
    attempt: number,
  ): Promise<Result<void, OutboxQueryError>> => {
    void now;
    void errorTag;
    return safe('markFailed', async () => {
      await db
        .update(schema.parEmailOutbox)
        .set({ attempts: attempt })
        .where(eq(schema.parEmailOutbox.eventId, eventId));
    });
  };

  // ── moveToDeadLetter (sem tabela DLQ: marca processed) ─────────────────────────

  const moveToDeadLetter = async (
    eventId: string,
    now: Date,
    _errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    return safe('moveToDeadLetter', async () => {
      await db
        .update(schema.parEmailOutbox)
        .set({ processedAt: now })
        .where(
          and(
            eq(schema.parEmailOutbox.eventId, eventId),
            isNull(schema.parEmailOutbox.processedAt),
          ),
        );
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
