// 009-contract-auto-expire — agendador do sweep de expiração, hospedado no worker de outbox.
// Roda `expire()` em ciclo, dorme `intervalMs` entre execuções e encerra ao receber o AbortSignal
// (graceful shutdown). Loga a contagem por ciclo. Falha de um ciclo é logada; o próximo tenta de novo.

import type { Result } from '../../../shared/primitives/result.ts';
import type { ExpireDueContractsResult } from '../application/use-cases/expire-due-contracts.ts';
import type { ContractRepositoryError } from '../domain/contract/repository.ts';

export type ExpireSchedulerDeps = Readonly<{
  expire: () => Promise<Result<ExpireDueContractsResult, ContractRepositoryError>>;
  abortSignal: AbortSignal;
  log: (message: string) => void;
}>;

// Sleep abortável: resolve no timeout OU no abort (o que vier antes), sem deixar timer/listener pendurado.
const abortableSleep = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal.addEventListener('abort', onAbort, { once: true });
  });

export const runExpireScheduler = async (
  deps: ExpireSchedulerDeps,
  intervalMs: number,
): Promise<void> => {
  // do-while: roda ao menos um ciclo, mesmo se o abort chegar durante o boot.
  do {
    const r = await deps.expire();
    if (r.ok) {
      deps.log(
        `[expire-sweep] scanned=${r.value.scanned} expired=${r.value.expired} ` +
          `failures=${r.value.failures.length}`,
      );
    } else {
      deps.log(`[expire-sweep] erro de varredura: ${r.error}`);
    }
    if (deps.abortSignal.aborted) break;
    await abortableSleep(intervalMs, deps.abortSignal);
  } while (!deps.abortSignal.aborted);
};
