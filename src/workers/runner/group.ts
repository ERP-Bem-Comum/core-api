// Runner de um grupo de workers — roda N loops isolados num único processo (issue #407).
//
// Cada worker é um `WorkerSpec` cujo `run(signal)` roda o loop até o AbortSignal (SIGTERM →
// shutdown drena todos). `Promise.allSettled` garante ISOLAMENTO de loop: um worker que rejeita
// não derruba os irmãos — os demais seguem processando (o resultado reporta a rejeição para log).
//
// NB: o "bulkhead" real (Newman) exigiria destinos distintos; aqui todos os workers do grupo
// falam com o MESMO RDS/db `core`, então o isolamento é de PROCESSO/loop, não de pool. O pool é
// compartilhado via PoolRegistry (dedup por connection-string) — ver run.ts (composition root).

export type WorkerSpec = Readonly<{
  name: string;
  // AbortSignal é mutável por natureza (addEventListener/aborted) — não há forma readonly.
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  run: (signal: AbortSignal) => Promise<void>;
}>;

export type WorkerResult =
  | Readonly<{ name: string; status: 'fulfilled' }>
  | Readonly<{ name: string; status: 'rejected'; reason: unknown }>;

export const runWorkerGroup = async (
  specs: readonly WorkerSpec[],
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  signal: AbortSignal,
): Promise<readonly WorkerResult[]> => {
  const settled = await Promise.allSettled(
    specs.map(async (spec) => {
      await spec.run(signal);
    }),
  );
  return specs.map((spec, i): WorkerResult => {
    const outcome = settled[i];
    if (outcome === undefined || outcome.status === 'fulfilled') {
      return { name: spec.name, status: 'fulfilled' };
    }
    return { name: spec.name, status: 'rejected', reason: outcome.reason };
  });
};
