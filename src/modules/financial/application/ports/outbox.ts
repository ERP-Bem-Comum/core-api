import type { Result } from '../../../../shared/primitives/result.ts';
import type { DocumentEvent } from '../../domain/document/events.ts';

// Outbox mínimo da Fatia 1: apenas append (publicação) dos eventos de domínio. O consumo/worker
// (delivery, DLQ, SKIP LOCKED) entra na fatia de integração cross-módulo (TituloConciliado).
export type OutboxAppendError = 'outbox-append-failed';

export type FinancialOutbox = Readonly<{
  append: (events: readonly DocumentEvent[]) => Promise<Result<void, OutboxAppendError>>;
}>;
