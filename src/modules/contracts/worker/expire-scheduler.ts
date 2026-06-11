// 009-contract-auto-expire — agendador do sweep de expiração, hospedado no worker de outbox.
// Roda `expire()` em ciclo, dorme `intervalMs` entre execuções e encerra ao receber o AbortSignal
// (graceful shutdown). Loga a contagem por ciclo. Falha de um ciclo é logada; o próximo tenta de novo.

import { setTimeout as delay } from 'node:timers/promises';

import type { Result } from '../../../shared/primitives/result.ts';
import type { ExpireDueContractsResult } from '../application/use-cases/expire-due-contracts.ts';
import type { ContractRepositoryError } from '../domain/contract/repository.ts';

export type ExpireSchedulerDeps = Readonly<{
  expire: () => Promise<Result<ExpireDueContractsResult, ContractRepositoryError>>;
  abortSignal: AbortSignal;
  log: (message: string) => void;
}>;

export const runExpireScheduler = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types -- AbortSignal é mutável por design
  deps: ExpireSchedulerDeps,
  intervalMs: number,
): Promise<void> => {
  // Loop infinito com breaks explícitos: roda ao menos um ciclo (mesmo se o abort chegar no boot)
  // e encerra no abort (logo após o sweep ou durante o sleep).
  for (;;) {
    const r = await deps.expire();
    if (r.ok) {
      deps.log(
        `[expire-sweep] scanned=${r.value.scanned} expired=${r.value.expired} ` +
          `failures=${r.value.failures.length}`,
      );
    } else {
      deps.log(`[expire-sweep] erro de varredura: ${JSON.stringify(r.error)}`);
    }
    if (deps.abortSignal.aborted) break;
    try {
      // `delay` rejeita com AbortError no shutdown → encerra o loop sem timer pendurado.
      await delay(intervalMs, undefined, { signal: deps.abortSignal });
    } catch {
      break;
    }
  }
};
