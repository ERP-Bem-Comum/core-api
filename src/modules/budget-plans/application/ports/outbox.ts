import type { Result } from '../../../../shared/primitives/result.ts';
import type { BudgetPlansModuleEvent } from '../../public-api/events.ts';

export type OutboxAppendError = 'outbox-append-failed';

export type OutboxPort = Readonly<{
  append: (events: readonly BudgetPlansModuleEvent[]) => Promise<Result<void, OutboxAppendError>>;
}>;
