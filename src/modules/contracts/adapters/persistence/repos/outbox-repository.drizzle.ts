import { isNull, asc, eq, and } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { OutboxPort } from '../../../application/ports/outbox.ts';
import {
  outboxAppendUnavailable,
  outboxAppendDuplicateEventId,
  outboxQueryUnavailable,
  outboxEventNotFound,
} from '../../../application/ports/outbox.ts';
import type { OutboxAppendError, OutboxQueryError } from '../../../application/ports/outbox.ts';
import type { ContractsModuleEvent } from '../../../application/ports/event-bus.ts';
import type { MysqlHandle } from '../drivers/mysql-driver.ts';
import { eventToOutboxInsert, type OutboxRow } from '../mappers/outbox.mapper.ts';
import type * as schema from '../schemas/mysql.ts';
import type { OutboxBatchOps } from '../../../worker/outbox-worker.ts';

// ─── ER_DUP_ENTRY detection ───────────────────────────────────────────────────

// mysql2 expõe `errno: 1062` e `code: 'ER_DUP_ENTRY'` no objeto Error lançado.
// Drizzle pode encadear o erro original em `cause`. Verificamos ambas as camadas.
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
// Função standalone para INSERT em batch no outbox DENTRO de uma transação já
// aberta pelo repo pai (contract-repository ou amendment-repository). O repo pai
// chama esta função dentro do próprio `db.transaction(async (tx) => { ... })` —
// garantindo que state + outbox são escritos na MESMA transação (D2, ADR-0015).
//
// Por que lança em vez de retornar Result?
//   O callback de `db.transaction` precisa propagar erros para que o Drizzle faça
//   rollback. Se este helper retornasse `err(...)`, o caller precisaria checar e
//   re-lançar — boilerplate que viola o princípio de "adapter converte na borda".
//   O repo pai captura qualquer throw dentro do callback via `safe()` e converte
//   para `ContractRepositoryError` / `AmendmentRepositoryError` antes de retornar
//   ao use case. Portanto `throw` aqui é correto — estamos ainda dentro do adapter.
//
// `tx` é tipado como `{ insert: MySql2Database<...>['insert'] }` para aceitar tanto
// `MySql2Database` (fora de tx) quanto `MySqlTransaction` (dentro de tx) —
// ambos expõem `.insert()`. O acoplamento structural é intencional e documentado.
export const appendOutboxInTx = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  tx: { insert: MysqlHandle['db']['insert'] },
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  schemaArg: typeof schema,
  events: readonly ContractsModuleEvent[],
): Promise<void> => {
  if (events.length === 0) return;
  const now = new Date();
  const inserts = events.map((e) => eventToOutboxInsert(e, now));
  await tx.insert(schemaArg.ctrOutbox).values(inserts);
};

// ─── safe wrapper ─────────────────────────────────────────────────────────────

const safe = async <T>(ctx: string, op: () => Promise<T>): Promise<Result<T, OutboxQueryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[outbox-repo:${ctx}] ${String(cause)}\n`);
    return err(outboxQueryUnavailable(String(cause)));
  }
};

// ─── Factory options ──────────────────────────────────────────────────────────

export type DrizzleOutboxRepositoryOptions = Readonly<{
  /** Override do gerador de UUID — útil para testes de ER_DUP_ENTRY determinísticos. */
  idGenerator?: () => string;
}>;

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * createDrizzleOutboxRepository
 *
 * Implementação do OutboxPort + auxiliares do worker para MySQL via Drizzle.
 *
 * Funções públicas do port:
 *   - `append(events)` — batch INSERT em `ctr_outbox`. ER_DUP_ENTRY → tagged.
 *
 * Auxiliares do worker (ticket #5):
 *   - `findPendingForUpdate(limit)` — SELECT WHERE processed_at IS NULL ORDER BY occurred_at FOR UPDATE SKIP LOCKED.
 *   - `markProcessed(eventId, now)` — UPDATE processed_at WHERE processed_at IS NULL (idempotente).
 *   - `markFailed(eventId, now, errorTag, attempt)` — UPDATE attempts + last_error.
 *   - `moveToDeadLetter(eventId, now, errorMessage)` — INSERT DLQ + DELETE outbox (transação).
 *
 * Helpers de teste (sincronos para compatibilidade com outbox.contract.ts):
 *   - `testHelpers.all()` — snapshot das rows inseridas via `append` nesta instância.
 *   - `testHelpers.pending()` — filtra rows do snapshot com processedAt null.
 *   - `testHelpers.markProcessed(eventId)` — atualiza processedAt no snapshot local.
 *
 * NOTA sobre testHelpers: o buffer é mantido em memória apenas para satisfazer a
 * interface síncrona da suite contratual. Não reflete o estado real do DB após
 * operações externas (DELETE, UPDATE por outro processo). Nunca usar em prod.
 */
export const createDrizzleOutboxRepository = (
  handle: MysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
  opts?: DrizzleOutboxRepositoryOptions,
): OutboxPort & {
  withPendingBatch: <R>(
    limit: number,
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
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
  testHelpers: {
    all: () => readonly OutboxRow[];
    pending: () => readonly OutboxRow[];
    markProcessed: (eventId: string) => void;
  };
} => {
  const { db, schema } = handle;
  const idGenerator = opts?.idGenerator;

  // ── Buffer interno para helpers de teste ──────────────────────────────────
  // Mantido sincronizado com cada `append` bem-sucedido.
  // Usado exclusivamente para satisfazer a interface síncrona da suite contratual.
  const appendedRows: OutboxRow[] = [];

  // ── append ────────────────────────────────────────────────────────────────

  const append = async (
    events: readonly ContractsModuleEvent[],
  ): Promise<Result<void, OutboxAppendError>> => {
    if (events.length === 0) return ok(undefined);

    const now = new Date();
    // eventToOutboxInsert é síncrono e não lança — o try é defesa em profundidade.
    const inserts = events.map((e) => eventToOutboxInsert(e, now, idGenerator));

    try {
      await db.insert(schema.ctrOutbox).values(inserts);
      // Sincronizar buffer de teste apenas após INSERT bem-sucedido.
      for (const insert of inserts) {
        appendedRows.push(insert as OutboxRow);
      }
      return ok(undefined);
    } catch (cause) {
      if (isDupEntry(cause)) {
        // Identificar qual eventId colidiu: o batch inteiro falhou, então
        // reportamos o primeiro ID que causaria colisão (o que disparou ER_DUP_ENTRY).
        // Como mysql2 não informa qual chave colidiu via código estruturado de forma
        // confiável no modo batch, retornamos o primeiro eventId do batch.
        // O adapter InMemory faz a mesma coisa (retorna o primeiro duplicado detectado).
        const firstId = inserts[0]?.eventId ?? 'unknown';
        return err(outboxAppendDuplicateEventId(firstId));
      }
      process.stderr.write(`[outbox-repo:append] ${String(cause)}\n`);
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
        .from(schema.ctrOutbox)
        .where(isNull(schema.ctrOutbox.processedAt))
        .orderBy(asc(schema.ctrOutbox.processedAt), asc(schema.ctrOutbox.occurredAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      return rows as readonly OutboxRow[];
    });
  };

  // ── withPendingBatch ──────────────────────────────────────────────────────
  // Consumo concorrente correto: abre UMA transação, trava até `limit` rows com
  // FOR UPDATE SKIP LOCKED, e invoca `handler` com as rows + ops de marcação
  // ligadas à MESMA transação (tx). O lock sobrevive até o COMMIT (ao fim do
  // handler) — é isso que faz o SKIP LOCKED particionar entre workers paralelos
  // (CTR-OUTBOX-SKIPLOCKED-DUP). As ops capturam erro de I/O em Result (best-effort,
  // como os helpers diretos); erro lançado pelo SELECT aborta a tx → err + rollback.

  const withPendingBatch = async <R>(
    limit: number,
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    handler: (rows: readonly OutboxRow[], ops: OutboxBatchOps) => Promise<R>,
  ): Promise<Result<R, OutboxQueryError>> => {
    try {
      const result = await db.transaction(async (tx) => {
        const rows = (await tx
          .select()
          .from(schema.ctrOutbox)
          .where(isNull(schema.ctrOutbox.processedAt))
          .orderBy(asc(schema.ctrOutbox.processedAt), asc(schema.ctrOutbox.occurredAt))
          .limit(limit)
          .for('update', { skipLocked: true })) as readonly OutboxRow[];

        const ops: OutboxBatchOps = {
          markProcessed: async (eventId, now) =>
            safe('withPendingBatch:markProcessed', async () => {
              await tx
                .update(schema.ctrOutbox)
                .set({ processedAt: now })
                .where(
                  and(eq(schema.ctrOutbox.eventId, eventId), isNull(schema.ctrOutbox.processedAt)),
                );
            }),
          markFailed: async (eventId, _now, _errorTag, attempt) =>
            safe('withPendingBatch:markFailed', async () => {
              await tx
                .update(schema.ctrOutbox)
                .set({ attempts: attempt })
                .where(eq(schema.ctrOutbox.eventId, eventId));
            }),
          moveToDeadLetter: async (eventId, now, errorMessage) =>
            safe('withPendingBatch:moveToDeadLetter', async () => {
              const target = rows.find((r) => r.eventId === eventId);
              if (target === undefined) return;
              await tx.insert(schema.ctrOutboxDeadLetter).values({
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
              await tx.delete(schema.ctrOutbox).where(eq(schema.ctrOutbox.eventId, eventId));
            }),
        };

        return handler(rows, ops);
      });
      return ok(result);
    } catch (cause) {
      process.stderr.write(`[outbox-repo:withPendingBatch] ${String(cause)}\n`);
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
      // A 2ª chamada com mesmo eventId é silenciosamente ignorada (0 rows affected = OK).
      await db
        .update(schema.ctrOutbox)
        .set({ processedAt: now })
        .where(and(eq(schema.ctrOutbox.eventId, eventId), isNull(schema.ctrOutbox.processedAt)));
    });
  };

  // ── markFailed ────────────────────────────────────────────────────────────

  const markFailed = async (
    eventId: string,
    now: Date,
    errorTag: string,
    attempt: number,
  ): Promise<Result<void, OutboxQueryError>> => {
    // `now` não é usado: ctr_outbox não tem coluna `last_failed_at` no schema atual
    // (ticket #1 não a incluiu). O worker (#5) pode adicionar via migration própria.
    // `errorTag` também não tem coluna na outbox — só na DLQ (`ctr_outbox_dead_letter`).
    // Por ora marcamos apenas `attempts`; o errorTag é reservado para moveToDeadLetter.
    void now;
    void errorTag;
    return safe('markFailed', async () => {
      await db
        .update(schema.ctrOutbox)
        .set({ attempts: attempt })
        .where(eq(schema.ctrOutbox.eventId, eventId));
    });
  };

  // ── moveToDeadLetter ──────────────────────────────────────────────────────
  // Implementação direta (sem safe()) para distinguir OutboxEventNotFound de
  // erros genéricos de I/O. Usa um Result<void, OutboxQueryError> retornado
  // pela tx interna como canal de controle — sem `class` (ESLint proíbe).

  const moveToDeadLetterFinal = async (
    eventId: string,
    now: Date,
    errorMessage: string,
  ): Promise<Result<void, OutboxQueryError>> => {
    try {
      // Usamos um array mutável como "out parameter" para transportar o Result
      // de dentro da tx para fora sem precisar de `class extends Error`.
      // A tx lança em caso de erro de I/O; erros lógicos (not-found) são capturados
      // no array e não causam rollback — só o fluxo normal de controle retorna err().
      const txResult: [OutboxQueryError | null] = [null];

      await db.transaction(async (tx) => {
        const rows = await tx
          .select()
          .from(schema.ctrOutbox)
          .where(eq(schema.ctrOutbox.eventId, eventId))
          .for('update');

        const row = rows[0];
        if (row === undefined) {
          // Sinaliza not-found via out-param; a tx não precisa ser abortada.
          txResult[0] = outboxEventNotFound(eventId);
          return;
        }

        await tx.insert(schema.ctrOutboxDeadLetter).values({
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

        await tx.delete(schema.ctrOutbox).where(eq(schema.ctrOutbox.eventId, eventId));
      });

      // Se a tx setou um erro lógico, devolve sem logar (não é falha de I/O).
      const logicError = txResult[0];
      if (logicError !== null) {
        return err(logicError);
      }
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[outbox-repo:moveToDeadLetter] ${String(cause)}\n`);
      return err(outboxQueryUnavailable(String(cause)));
    }
  };

  // ── testHelpers ───────────────────────────────────────────────────────────

  const testHelpers = {
    all: (): readonly OutboxRow[] => appendedRows as readonly OutboxRow[],
    pending: (): readonly OutboxRow[] =>
      appendedRows.filter((r) => r.processedAt === null) as readonly OutboxRow[],
    markProcessed: (targetEventId: string): void => {
      const row = appendedRows.find((r) => r.eventId === targetEventId);
      if (row !== undefined) {
        // Mutação controlada apenas dentro do helper de teste.
        (row as { processedAt: Date | null }).processedAt = new Date();
      }
    },
  };

  return {
    append,
    withPendingBatch,
    findPendingForUpdate,
    markProcessed,
    markFailed,
    moveToDeadLetter: moveToDeadLetterFinal,
    testHelpers,
  };
};
