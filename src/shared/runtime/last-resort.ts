import process from 'node:process';

/**
 * Handlers de último recurso para erros FORA da cadeia de promise — throw
 * síncrono num callback de driver, `EventEmitter` sem catch, `setImmediate`.
 * Sem eles o Node encerra com exit 1 SEM drenar recursos (pool MySQL abandonado
 * até o `wait_timeout`). Ref: `handbook/reference/nodejs/Process.md`.
 *
 * Deps injetáveis: o teste passa um `on`/`exit`/`write` falso, sem mexer no
 * `process` global; produção usa `processLastResortDeps()`.
 */
export type LastResortDeps = Readonly<{
  on: (
    event: 'uncaughtException' | 'unhandledRejection',
    listener: (cause: unknown) => void,
  ) => void;
  exit: (code: number) => void;
  write: (message: string) => void;
}>;

export const processLastResortDeps = (): LastResortDeps => ({
  on: (event, listener) => {
    process.on(event, (cause: unknown) => {
      listener(cause);
    });
  },
  exit: (code) => {
    process.exit(code);
  },
  write: (message) => {
    process.stderr.write(message);
  },
});

/**
 * Registra os handlers. Em fatal: loga `tipo: causa` em stderr, roda `shutdown`
 * (best-effort — não relança) e sai com código 1 SOMENTE após o shutdown
 * resolver, garantindo a drenagem antes do encerramento.
 */
export const installLastResortHandlers = (
  shutdown: () => Promise<void>,
  deps: LastResortDeps,
): void => {
  const onFatal =
    (label: string) =>
    (cause: unknown): void => {
      deps.write(`❌ ${label}: ${String(cause)}\n`);
      void shutdown().finally(() => {
        deps.exit(1);
      });
    };
  deps.on('uncaughtException', onFatal('uncaughtException'));
  deps.on('unhandledRejection', onFatal('unhandledRejection'));
};
