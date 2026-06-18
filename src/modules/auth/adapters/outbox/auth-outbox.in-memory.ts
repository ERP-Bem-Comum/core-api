// Adapter InMemory do OutboxPort do auth (AUTH-DOMAIN-OUTBOX / ADR-0047).
// Espelha `partners/adapters/outbox/outbox.in-memory.ts`, GENERICO: `append` recebe
// `OutboxMessage[]` ja montadas. Usado em testes (unit/contrato) e no boot HTTP sem DB.
// Mesma semantica do adapter Drizzle (deteta eventId duplicado como a PK do banco).
//
// ADR-0015 (outbox), ADR-0014 (auth_*). Sem `class` (factory de closures).

import { ok, err } from '#src/shared/primitives/result.ts';
import type { OutboxPort, OutboxMessage, OutboxRow } from '../../application/ports/outbox.ts';
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
 * InMemoryAuthOutbox — adapter InMemory do OutboxPort do auth.
 *
 * Expoe `all()`/`pending()` para inspecao em testes. `append` rejeita eventId duplicado
 * (espelha a PK do banco). `clear()` reseta o estado interno.
 */
export const InMemoryAuthOutbox = (): {
  port: OutboxPort;
  all: () => readonly OutboxRow[];
  pending: () => readonly OutboxRow[];
  clear: () => void;
} => {
  const rows: OutboxRow[] = [];
  const seenIds = new Set<string>();

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

  return {
    port,
    all: () => rows as readonly OutboxRow[],
    pending: () => rows.filter((r) => r.processedAt === null) as readonly OutboxRow[],
    clear: () => {
      rows.length = 0;
      seenIds.clear();
    },
  };
};
