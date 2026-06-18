import type { Result } from '../../../../shared/primitives/result.ts';
import type { DocumentEvent } from '../../domain/document/events.ts';
import type { BankStatementEvent } from '../../domain/statement/events.ts';

// Outbox mínimo da Fatia 1: apenas append (publicação) dos eventos de domínio. O consumo/worker
// (delivery, DLQ, SKIP LOCKED) entra na fatia de integração cross-módulo (TituloConciliado).
export type OutboxAppendError = 'outbox-append-failed';

// Eventos publicáveis pelo módulo: documento fiscal (Fatia 1) + extrato bancário (US1 conciliação).
export type FinancialAppendableEvent = DocumentEvent | BankStatementEvent;

export type FinancialOutbox = Readonly<{
  append: (events: readonly FinancialAppendableEvent[]) => Promise<Result<void, OutboxAppendError>>;
}>;
