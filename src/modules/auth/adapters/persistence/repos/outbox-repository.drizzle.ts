// Adapter Drizzle do OutboxPort do auth (AUTH-DOMAIN-OUTBOX / ADR-0047).
// Espelha `partners/.../outbox-repository.drizzle.ts`, GENERICO (opera sobre `OutboxMessage`).
//
//   - append(messages) — batch INSERT em `auth_outbox`. ER_DUP_ENTRY → tagged.
//   - appendOutboxInTx(tx, schema, messages) — INSERT batch DENTRO de uma tx ja aberta
//     pelo repo do agregado (save do reset/invite-token) — estado + outbox na MESMA tx
//     (atomicidade — ADR-0015). Lanca em erro p/ o Drizzle fazer rollback; o repo pai
//     converte o throw em Result na borda.
//
// Worker (consumo) e a fatia 02 (NOTIF-EMAIL-EVENT-CONSUMER) — nao implementado aqui (dark-launch).
//
// ADR-0015 (outbox), ADR-0014 (auth_*), ADR-0020 (sem JSON nativo). Boundary: try/catch → Result.

import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  OutboxPort,
  OutboxMessage,
  OutboxRow,
  OutboxAppendError,
} from '../../../application/ports/outbox.ts';
import {
  outboxAppendUnavailable,
  outboxAppendDuplicateEventId,
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

/**
 * createDrizzleAuthOutboxRepository — OutboxPort (`append`) para MySQL via Drizzle.
 * O caminho atomico (save + evento) usa `appendOutboxInTx` no repo do token; este `append`
 * direto serve testes contratuais / boot sem agregado.
 */
export const createDrizzleAuthOutboxRepository = (
  handle: AuthMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): OutboxPort => {
  const { db } = handle;

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

  return { append };
};
