/**
 * Guard de idempotência para shutdown.
 *
 * Problema: `src/server.ts` registra handlers para SIGTERM, SIGINT e, via
 * `installLastResortHandlers`, para uncaughtException/unhandledRejection.
 * Todos chamam a mesma função de shutdown. Se dois eventos chegam no mesmo
 * ciclo de vida (ex.: SIGTERM seguido de uncaughtException), `app.close()`
 * e `deps.shutdown()` seriam invocados 2×, causando erros de "already
 * closed" em pools e sockets.
 *
 * Solução: `makeShutdownOnce` retorna uma função que executa `fn` apenas
 * na primeira invocação. Chamadas subsequentes retornam sem efeito.
 *
 * Padrão idêntico ao `shutdownOnce` inline de
 * `src/modules/contracts/cli/main.ts` — extraído aqui para ser testável
 * e reutilizável pelo server.
 *
 * Ref: handbook/reference/nodejs/Process.md §"Warning: Using
 * 'uncaughtException' correctly" — "The correct use of
 * 'uncaughtException' is to perform synchronous cleanup of allocated
 * resources before shutting down the process."
 */
export const makeShutdownOnce = (fn: () => Promise<void>): (() => Promise<void>) => {
  let running = false;
  return async (): Promise<void> => {
    if (running) return;
    running = true;
    await fn();
  };
};
