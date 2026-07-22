// Composition root do worker-runner (issue #407) — consolida os workers de um GRUPO num único
// processo, compartilhando UM pool por connection-string (PoolRegistry). Substitui os 6 entrypoints
// standalone por 3 (WORKER_GROUP=outbox|projections|email), cortando tasks Fargate e pools contra o RDS.
//
// Isolamento: `runWorkerGroup` roda os loops em Promise.allSettled — um worker que rejeita não
// derruba os irmãos. Shutdown: SIGTERM/SIGINT abortam todos os loops e o registry drena os pools.

import process from 'node:process';

import { createPoolRegistry } from '#src/shared/persistence/pool-registry.ts';
import { runWorkerGroup, type WorkerSpec } from './group.ts';
import { GROUPS } from './specs.ts';

const EX_CONFIG = 78; // sysexits.h — erro de configuração.

type GroupName = keyof typeof GROUPS;

const isGroupName = (g: string | undefined): g is GroupName =>
  g === 'outbox' || g === 'projections' || g === 'email';

const main = async (): Promise<number> => {
  const group = process.env['WORKER_GROUP'];
  if (!isGroupName(group)) {
    process.stderr.write(
      `[worker-runner] WORKER_GROUP inválido: ${String(group)} — use outbox|projections|email\n`,
    );
    return EX_CONFIG;
  }

  const registry = createPoolRegistry();

  // Monta os specs do grupo. Cada builder deduplica o pool via registry.getOrCreate (as
  // *_DATABASE_URL apontam para o mesmo RDS/db `core` → 1 pool por grupo).
  const specs: WorkerSpec[] = [];
  for (const build of GROUPS[group]) {
    const built = build(registry, process.env);
    if (!built.ok) {
      process.stderr.write(`[worker-runner:${group}] falha ao montar worker: ${built.error}\n`);
      await registry.closeAll();
      return EX_CONFIG;
    }
    specs.push(built.value);
  }

  const controller = new AbortController();
  const shutdown = (): void => {
    controller.abort();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  process.stderr.write(
    `[worker-runner:${group}] iniciando ${specs.length} worker(s): ${specs.map((s) => s.name).join(', ')}\n`,
  );

  try {
    const results = await runWorkerGroup(specs, controller.signal);
    let failed = 0;
    for (const r of results) {
      if (r.status === 'rejected') {
        failed += 1;
        const detail =
          r.reason instanceof Error ? (r.reason.stack ?? r.reason.message) : String(r.reason);
        process.stderr.write(
          `[worker-runner:${group}] worker '${r.name}' terminou com erro: ${detail}\n`,
        );
      }
    }
    process.stderr.write(
      `[worker-runner:${group}] shutdown — ${results.length - failed}/${results.length} ok\n`,
    );
    return failed > 0 ? 1 : 0;
  } catch (cause) {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`[worker-runner:${group}] erro fatal: ${detail}\n`);
    return 1;
  } finally {
    process.off('SIGTERM', shutdown);
    process.off('SIGINT', shutdown);
    await registry.closeAll();
  }
};

await main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((cause: unknown) => {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`[worker-runner] rejeição não tratada no main: ${detail}\n`);
    process.exitCode = 1;
  });
