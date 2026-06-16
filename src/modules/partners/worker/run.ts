// Entrypoint standalone do worker de outbox do `partners` (ADR-0015).
// Replica `contracts/worker/run.ts`, trocando o driver do contracts pelo
// `openPartnersMysql` (pool MySQL próprio do módulo partners) e a env de config.
// Processo dedicado, foreground, encerrado por SIGTERM/SIGINT.
//
// Migrations: o worker NÃO as aplica (`applyMigrations: false`) — são responsabilidade
// do release (server/job de migração).

import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { openPartnersMysql } from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleOutboxRepository } from '../adapters/persistence/repos/outbox-repository.drizzle.ts';
import { LoggerEventDelivery } from '../adapters/event-delivery/event-delivery.logger.ts';
import { runLoop } from './outbox-worker.ts';
import { readWorkerConfig } from './config.ts';

const EX_CONFIG = 78; // sysexits.h — erro de configuração.

const main = async (): Promise<number> => {
  const configR = readWorkerConfig(process.env);
  if (!configR.ok) {
    process.stderr.write(`[partners-outbox-worker] configuração inválida: ${configR.error}\n`);
    return EX_CONFIG;
  }
  const config = configR.value;

  const handleR = await openPartnersMysql({
    connectionString: config.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) {
    process.stderr.write(`[partners-outbox-worker] falha ao abrir MySQL: ${handleR.error}\n`);
    return 1;
  }
  const handle = handleR.value;
  const outbox = createDrizzleOutboxRepository(handle);
  const delivery = LoggerEventDelivery(config.consumerId, config.logFile);

  // Graceful shutdown: SIGTERM/SIGINT abortam o loop; runLoop retorna no fim da iteração.
  const controller = new AbortController();
  const shutdown = (): void => {
    controller.abort();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  process.stderr.write(
    `[partners-outbox-worker] iniciando — batch=${config.loop.batchSize} maxAttempts=${config.loop.maxAttempts} ` +
      `pollMs=${config.loop.pollIntervalMs} idleMs=${config.loop.idleSleepMs ?? config.loop.pollIntervalMs} ` +
      `consumer=${config.consumerId}\n`,
  );

  try {
    const stats = await runLoop(
      { outbox, delivery, clock: ClockReal(), abortSignal: controller.signal },
      config.loop,
    );
    process.stderr.write(
      `[partners-outbox-worker] shutdown limpo — stats: ${JSON.stringify(stats)}\n`,
    );
    return 0;
  } catch (cause) {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`[partners-outbox-worker] erro fatal: ${detail}\n`);
    return 1;
  } finally {
    process.off('SIGTERM', shutdown);
    process.off('SIGINT', shutdown);
    await handle.close();
  }
};

await main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((cause: unknown) => {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`[partners-outbox-worker] rejeição não tratada no main: ${detail}\n`);
    process.exitCode = 1;
  });
