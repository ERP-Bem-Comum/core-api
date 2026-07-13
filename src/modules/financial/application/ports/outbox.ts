import type { Result } from '../../../../shared/primitives/result.ts';
import type { DocumentEvent } from '../../domain/document/events.ts';
import type { BankStatementEvent } from '../../domain/statement/events.ts';
import type { ReconciliationEvent } from '../../domain/reconciliation/events.ts';
import type { ExpectedCounterpartEvent } from '../../domain/expected-counterpart/events.ts';
import type {
  ReconciliationPeriodClosed,
  ReconciliationPeriodReopened,
} from '../../domain/reconciliation/period.ts';

// Outbox mínimo da Fatia 1: apenas append (publicação) dos eventos de domínio. O consumo/worker
// (delivery, DLQ, SKIP LOCKED) entra na fatia de integração cross-módulo (TituloConciliado).
export type OutboxAppendError = 'outbox-append-failed';

// Eventos publicáveis: documento fiscal (Fatia 1) + extrato (US1) + conciliação (US2/3/4) +
// período fechado (US6) + período reaberto (#203) + contrapartida esperada (#269).
export type FinancialAppendableEvent =
  | DocumentEvent
  | BankStatementEvent
  | ReconciliationEvent
  | ReconciliationPeriodClosed
  | ReconciliationPeriodReopened
  | ExpectedCounterpartEvent;

export type FinancialOutbox = Readonly<{
  append: (events: readonly FinancialAppendableEvent[]) => Promise<Result<void, OutboxAppendError>>;
}>;
