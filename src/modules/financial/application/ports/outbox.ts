/**
 * OutboxPort — driven port para persistência de eventos no outbox do módulo
 * Financial (ADR-0015 — Outbox MySQL).
 *
 * Consumido internamente pelo adapter de repositório (dentro da transação),
 * não pelo use case diretamente — replicando a decisão D2 do plano Outbox MySQL
 * já consolidado em `src/modules/contracts/application/ports/outbox.ts`.
 *
 * A assinatura sem `tx` é intencional: o InMemory funciona sem transação; a
 * versão Drizzle (`FIN-ADAPTER-OUTBOX-DRIZZLE`) usará `appendInTx(tx, events)`
 * internamente mas exporá este port público simples para os testes contratuais.
 *
 * Posicionamento — `application/ports/` (não `domain/`): este port é técnico
 * (transporte async de eventos), sem invariante de agregado. Difere do
 * `PayableRepository` em `domain/payable/repository.ts` que carrega R2 FITID.
 */

import type { Result } from '#src/shared/index.ts';
import type { FinancialModuleEvent } from '../../public-api/events.ts';

// ─── Tagged errors (Padrão D) ─────────────────────────────────────────────────

export type OutboxAppendUnavailable = Readonly<{ tag: 'OutboxAppendUnavailable' }>;

export type OutboxAppendSerializationFailed = Readonly<{
  tag: 'OutboxAppendSerializationFailed';
  eventType: string;
  reason: string;
}>;

export type OutboxAppendDuplicateEventId = Readonly<{
  tag: 'OutboxAppendDuplicateEventId';
  eventId: string;
}>;

export type OutboxAppendError =
  | OutboxAppendUnavailable
  | OutboxAppendSerializationFailed
  | OutboxAppendDuplicateEventId;

// ─── Constructors ─────────────────────────────────────────────────────────────

export const outboxAppendUnavailable = (): OutboxAppendUnavailable => ({
  tag: 'OutboxAppendUnavailable',
});

export const outboxAppendSerializationFailed = (
  eventType: string,
  reason: string,
): OutboxAppendSerializationFailed => ({
  tag: 'OutboxAppendSerializationFailed',
  eventType,
  reason,
});

export const outboxAppendDuplicateEventId = (eventId: string): OutboxAppendDuplicateEventId => ({
  tag: 'OutboxAppendDuplicateEventId',
  eventId,
});

// ─── Port ─────────────────────────────────────────────────────────────────────

export type OutboxPort = Readonly<{
  append: (events: readonly FinancialModuleEvent[]) => Promise<Result<void, OutboxAppendError>>;
}>;
