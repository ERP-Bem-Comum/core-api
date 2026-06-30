import type { Result } from '../../../../shared/primitives/result.ts';
import type { ProgramsModuleEvent } from '../../public-api/events.ts';

// Port do outbox. Erro em kebab EN (consistente com o resto do módulo programs).

export type OutboxAppendError = 'outbox-append-failed';

export type OutboxPort = Readonly<{
  append: (events: readonly ProgramsModuleEvent[]) => Promise<Result<void, OutboxAppendError>>;
}>;
