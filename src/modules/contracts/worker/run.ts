// Entrypoint standalone do worker de outbox (CLI-RETIRE-EMBEDDED / ADR-0015 / ADR-0037).
// Processo dedicado, foreground, encerrado por SIGTERM/SIGINT. Lê config do ambiente
// (`worker/config.ts`), wira o adapter Drizzle do outbox sobre um pool MySQL próprio e roda
// `runLoop` até o shutdown. NÃO depende de nenhum código de `cli/` — a CLI embutida foi removida.
//
// Migrations: o worker NÃO as aplica (`applyMigrations: false`) — são responsabilidade do release
// (server/job de migração). Espelha o reader pool do módulo (composition.ts), que também não migra.

import process from 'node:process';

import { ClockReal } from '../../../shared/adapters/clock-real.ts';
import { openMysql } from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleOutboxRepository } from '../adapters/persistence/repos/outbox-repository.drizzle.ts';
import { LoggerEventDelivery } from '../adapters/event-delivery/event-delivery.logger.ts';
import { runLoop } from './outbox-worker.ts';
import { readWorkerConfig } from './config.ts';

const EX_CONFIG = 78; // sysexits.h — erro de configuração.

const main = async (): Promise<number> => {
  const configR = readWorkerConfig(process.env);
  if (!configR.ok) {
    process.stderr.write(`[outbox-worker] configuração inválida: ${configR.error}\n`);
    return EX_CONFIG;
  }
  const config = configR.value;

  const handleR = await openMysql({
    connectionString: config.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) {
    process.stderr.write(`[outbox-worker] falha ao abrir MySQL: ${handleR.error}\n`);
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

  // Daemon: logs operacionais vão para stderr (stdout reservado a dados consumíveis).
  process.stderr.write(
    `[outbox-worker] iniciando — batch=${config.loop.batchSize} maxAttempts=${config.loop.maxAttempts} ` +
      `pollMs=${config.loop.pollIntervalMs} idleMs=${config.loop.idleSleepMs ?? config.loop.pollIntervalMs} ` +
      `consumer=${config.consumerId}\n`,
  );

  try {
    const stats = await runLoop(
      { outbox, delivery, clock: ClockReal(), abortSignal: controller.signal },
      config.loop,
    );
    process.stderr.write(`[outbox-worker] shutdown limpo — stats: ${JSON.stringify(stats)}\n`);
    return 0;
  } catch (cause) {
    // Preserva o stack trace (cause pode ser Error) — diagnosticar crash de daemon exige stack.
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`[outbox-worker] erro fatal: ${detail}\n`);
    return 1;
  } finally {
    // No caminho de shutdown por sinal, `process.once` já se auto-removeu; aqui cobre o
    // caminho de erro (evita listener pendurado durante/após o handle.close()).
    process.off('SIGTERM', shutdown);
    process.off('SIGINT', shutdown);
    await handle.close();
  }
};

// Defesa em profundidade: o try/catch interno de main() deve capturar tudo, mas um reject
// inesperado não pode escapar como unhandledRejection (deixaria o pool sem fechar).
await main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((cause: unknown) => {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`[outbox-worker] rejeição não tratada no main: ${detail}\n`);
    process.exitCode = 1;
  });
