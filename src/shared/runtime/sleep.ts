import { setTimeout as delay } from 'node:timers/promises';

/**
 * Dorme `ms` milissegundos; resolve antes, sem rejeitar, se o `signal` abortar. Não deixa listener
 * no `signal` depois de resolver, então pode ser chamado em loop com o mesmo `signal`.
 *
 * @param ms - duração do sono em milissegundos
 * @param signal - aborta o sono quando disparado
 * @see tests/shared/runtime/sleep.test.ts
 */
export const sleep = async (ms: number, signal?: AbortSignal): Promise<void> => {
  if (signal === undefined) return delay(ms);
  if (signal.aborted) return;
  await delay(ms, undefined, { signal }).catch((error: unknown) => {
    if (!signal.aborted) throw error;
  });
};
