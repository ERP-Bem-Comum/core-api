/**
 * Adapter InMemory do `OutboxPort` do módulo Financial.
 *
 * Usado em:
 * - Testes unitários e contratuais (adapter de referência via `runOutboxContract`).
 * - CLI da P.O. com driver `memory` (futuro `FIN-CLI-RUN-OUTBOX-WORKER`).
 *
 * **Escopo intencionalmente enxuto.** API do factory:
 *   - `port.append` — único método público do `OutboxPort`.
 *   - `all` / `pending` — inspeção síncrona para testes.
 *   - `markProcessedSync` — transição manual de pending → processed para a
 *     suite contratual (que exige assinatura `(id) => void`).
 *   - `clear` — reset interno entre testes.
 *
 * Worker helpers (`findPendingForUpdate`, `markFailed`, `moveToDeadLetter`)
 * ficam para `FIN-WORKER-OUTBOX` junto do schema MySQL e do mapper Drizzle
 * (analogamente, `OutboxRow` "real" virá com o adapter Drizzle).
 *
 * Detecção de eventId duplicado segue a mesma semântica da PK do banco no
 * adapter Drizzle futuro (defesa em profundidade): cada INSERT com mesmo
 * `event_id` seria rejeitado — aqui simulamos com `Set<string>`.
 */

import { ok, err } from '#src/shared/index.ts';
import type { Result } from '#src/shared/index.ts';
import { newUuid } from '#src/shared/utils/id.ts';
import type { OutboxPort, OutboxAppendError } from '../../application/ports/outbox.ts';
import { outboxAppendDuplicateEventId } from '../../application/ports/outbox.ts';
import type { FinancialModuleEvent } from '../../public-api/events.ts';

// ─── Row interna (shape mínimo) ───────────────────────────────────────────────

/**
 * Shape mínimo da row do outbox InMemory.
 *
 * Mapper completo (`eventToOutboxInsert` / `outboxRowToEvent`) virá com
 * `FIN-ADAPTER-OUTBOX-DRIZZLE` junto do schema MySQL real. Aqui só temos os
 * campos suficientes para o worker iterar (`pending` por `processedAt === null`,
 * incremento de `attempts`).
 */
export type FinancialOutboxRow = Readonly<{
  eventId: string;
  eventType: string;
  processedAt: Date | null;
  attempts: number;
  occurredAt: Date;
}>;

// ─── Factory ──────────────────────────────────────────────────────────────────

export const InMemoryOutbox = (): {
  port: OutboxPort;
  all: () => readonly FinancialOutboxRow[];
  pending: () => readonly FinancialOutboxRow[];
  /**
   * Marca um evento como processado de forma síncrona. Usado pela suite
   * contratual (`outbox.contract.ts`) que exige assinatura `(id) => void`.
   * Quando o worker existir (`FIN-WORKER-OUTBOX`), uma versão async
   * `markProcessed(eventId, now)` será adicionada com mesma semântica do
   * adapter Drizzle.
   */
  markProcessedSync: (eventId: string) => void;
  /** Reseta o estado interno — útil em setupWorld para isolar eventos do teste. */
  clear: () => void;
} => {
  // Arrays mutáveis internamente — a API pública devolve readonly.
  const rows: FinancialOutboxRow[] = [];
  const seenIds = new Set<string>();

  // ── port.append ──────────────────────────────────────────────────────────

  const port: OutboxPort = {
    append: async (
      events: readonly FinancialModuleEvent[],
    ): Promise<Result<void, OutboxAppendError>> => {
      // No-op seguro para lista vazia.
      if (events.length === 0) return ok(undefined);

      const inserts: FinancialOutboxRow[] = events.map((e) => ({
        eventId: newUuid(),
        eventType: e.type,
        processedAt: null,
        attempts: 0,
        occurredAt: e.occurredAt,
      }));

      // Defesa em profundidade — não ocorre com UUIDs gerados aqui, mas alinha
      // com semântica da PK no adapter Drizzle futuro.
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

  // ── helpers exclusivos de teste ──────────────────────────────────────────

  const markProcessedSync = (eventId: string): void => {
    const row = rows.find((r) => r.eventId === eventId);
    if (row?.processedAt === null) {
      // Mutação controlada apenas dentro do adapter InMemory.
      (row as { processedAt: Date | null }).processedAt = new Date();
    }
  };

  const clear = (): void => {
    rows.length = 0;
    seenIds.clear();
  };

  return {
    port,
    all: () => rows as readonly FinancialOutboxRow[],
    pending: () => rows.filter((r) => r.processedAt === null) as readonly FinancialOutboxRow[],
    markProcessedSync,
    clear,
  };
};
