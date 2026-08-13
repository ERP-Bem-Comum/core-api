/**
 * `sleep` cancelável por `AbortSignal` — o pedaço que todo loop de worker precisa para dormir sem
 * atrasar o shutdown. Sem o `addEventListener('abort')`, um SIGTERM durante o sono só teria efeito
 * quando o timer vencesse: até 5 minutos de espera para um processo que já deveria ter morrido.
 *
 * Vive em `shared/runtime/` porque é mecânica de processo, não regra de domínio nem primitiva de
 * tipo. Extraído de `shared/outbox/outbox-worker.ts` quando o segundo loop apareceu — a alternativa
 * era a terceira cópia, e cópia de espera é onde o shutdown silenciosamente diverge.
 */

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
export const sleep = async (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve) => {
    if (signal?.aborted === true) {
      resolve();
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
