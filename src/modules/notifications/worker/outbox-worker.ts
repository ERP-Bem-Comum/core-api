/**
 * Worker de outbox de e-mail do `notifications` — wrapper fino sobre o worker genérico
 * (`#src/shared/outbox`, CORE-OUTBOX-WORKER-GENERIC). Ponto de variação do módulo:
 * `rowToProcessed = rowToEmailMessage` (desserializa o payload em EmailMessage; payload
 * corrupto → DLQ direto, CA6).
 *
 * ADR-0015 (outbox). Graceful shutdown via AbortSignal (Node 24).
 */
import { runOnce as genericRunOnce, runLoop as genericRunLoop } from '#src/shared/outbox/index.ts';
import type {
  WorkerOutboxOps,
  WorkerConfig,
  WorkerStats,
  OutboxQueryError,
  EventDelivery,
} from '#src/shared/outbox/index.ts';
import type { Result } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import type { EmailMessage } from '../domain/email/types.ts';
import { rowToEmailMessage } from '../adapters/outbox/email-message.mapper.ts';

export type { WorkerConfig, WorkerStats } from '#src/shared/outbox/index.ts';

/** Dependências do worker de e-mail (assinatura estável para run.ts e testes). */
export type WorkerDeps = Readonly<{
  outbox: WorkerOutboxOps;
  delivery: EventDelivery<EmailMessage>;
  clock: Clock;
  abortSignal?: AbortSignal;
}>;

const TAG = '[notifications-email-worker] ';

export const runOnce = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  deps: WorkerDeps,
  config: WorkerConfig,
): Promise<Result<WorkerStats, OutboxQueryError>> =>
  genericRunOnce<EmailMessage>({ ...deps, rowToProcessed: rowToEmailMessage, tag: TAG }, config);

export const runLoop = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  deps: WorkerDeps,
  config: WorkerConfig,
): Promise<WorkerStats> =>
  genericRunLoop<EmailMessage>({ ...deps, rowToProcessed: rowToEmailMessage, tag: TAG }, config);
