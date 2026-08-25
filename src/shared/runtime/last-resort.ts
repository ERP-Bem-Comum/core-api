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
 *
 * O `.catch()` abaixo é o que torna "best-effort" VERDADE POR CONSTRUÇÃO (#632). A versão
 * anterior usava `void shutdown().finally(...)`, e `finally` REPASSA a rejeição — o contrato
 * declarado neste docstring só se cumpria por acidente de timing: `deps.exit(1)` roda dentro do
 * `finally` e `process.exit` é síncrono, então o processo morria antes de a rejeição ser
 * reportada. Bastava o `exit` ser um dublê (todo teste) para a rejeição ficar solta.
 *
 * Isso importa além do teste. O `drain` dos workers multi-pool encadeia `await a.close();
 * await b.close()`: se o primeiro rejeita, o segundo NUNCA roda e aquele pool fica pendurado até o
 * `wait_timeout` — o Incident-0001 de novo, justamente no caminho fatal onde a drenagem é a única
 * defesa (o `finally` do fluxo normal não roda). A garantia mora AQUI, e não em cada `drain`, para
 * valer também nos chamadores que ainda não existem.
 */
export const installLastResortHandlers = (
  shutdown: () => Promise<void>,
  deps: LastResortDeps,
): void => {
  const onFatal =
    (label: string) =>
    (cause: unknown): void => {
      deps.write(`❌ ${label}: ${String(cause)}\n`);
      void shutdown()
        .catch((reason: unknown) => {
          // Falha de drenagem é reportada, nunca propagada: já estamos no caminho fatal, e
          // transformar isto em `unhandledRejection` re-entraria no próprio handler.
          deps.write(`❌ ${label}: shutdown falhou: ${String(reason)}\n`);
        })
        .finally(() => {
          deps.exit(1);
        });
    };
  deps.on('uncaughtException', onFatal('uncaughtException'));
  deps.on('unhandledRejection', onFatal('unhandledRejection'));
};
