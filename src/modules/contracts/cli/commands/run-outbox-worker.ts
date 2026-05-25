import process from 'node:process';

import type { CliContext } from '../context.ts';
import { parseFlags, validateAllowedFlags } from '../parse-flags.ts';
import { runLoop, type WorkerConfig } from '../../worker/outbox-worker.ts';
import { LoggerEventDelivery } from '../../adapters/event-delivery/event-delivery.logger.ts';

// ─── Flags suportadas ─────────────────────────────────────────────────────────

const ALLOWED = [
  'batch-size',
  'max-attempts',
  'poll-ms',
  'idle-sleep-ms',
  'consumer-id',
  'log-file',
  'help',
  'h',
  // Flag de teste: pré-aborta o AbortController antes de chamar runLoop.
  // Permite que CA-T3 valide o shutdown imediato sem sleep real.
  // Reconhecida pelo parser mas não documentada no help público.
  'test-abort',
] as const;

// ─── Exports obrigatórios do SubCommand ───────────────────────────────────────

export const descricao = 'Executa o worker do outbox em loop até SIGTERM/SIGINT.';

export const help = `Uso: run-outbox-worker [flags]

  Inicia o worker de outbox em foreground. Requer --driver mysql.
  Para encerrar: Ctrl+C (SIGINT) ou SIGTERM. Exit 0 em shutdown limpo.

Flags opcionais:
  --batch-size N          Eventos processados por iteração. Default: 10
  --max-attempts N        Tentativas antes de mover para DLQ. Default: 5
  --poll-ms N             Sleep entre rounds com trabalho (ms). Default: 100
  --idle-sleep-ms N       Sleep quando outbox vazia (ms). Default: 500
  --consumer-id ID        ID do consumer para LoggerEventDelivery. Default: cli-logger-default
  --log-file PATH         Se presente, escreve JSONL também no arquivo indicado

Exemplo:
  pnpm cli:contracts run-outbox-worker --driver mysql \\
    --connection-string 'mysql://user:pass@127.0.0.1:3306/core' \\
    --batch-size 20 --consumer-id prod-worker-1`;

// ─── run ─────────────────────────────────────────────────────────────────────

export const run = async (ctx: CliContext, argv: readonly string[]): Promise<number> => {
  // Verificar --help antes de qualquer outra coisa (inclusive validação de driver).
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stdout.write(`${help}\n`);
    return 0;
  }

  // CA-T1: driver memory não faz sentido para o worker — outbox in-memory
  // não persiste entre processos e não representa o outbox real do MySQL.
  if (ctx.driver !== 'mysql') {
    process.stderr.write(
      '❌ run-outbox-worker requer --driver mysql. O outbox in-memory não persiste eventos reais.\n',
    );
    return 1;
  }

  // Parsear flags do subcomando.
  const parsedR = parseFlags(argv);
  if (!parsedR.ok) {
    process.stderr.write(`❌ Flag inválida: --${parsedR.error.flag}\n`);
    return 64;
  }

  const allowedR = validateAllowedFlags(parsedR.value, ALLOWED);
  if (!allowedR.ok) {
    process.stderr.write(`❌ Flag desconhecida: --${allowedR.error.flag}\n`);
    return 64;
  }

  const flags = parsedR.value;

  // Validar tipos numéricos.
  const batchSizeRaw = flags['batch-size'] !== undefined ? Number(flags['batch-size']) : 10;
  const maxAttemptsRaw = flags['max-attempts'] !== undefined ? Number(flags['max-attempts']) : 5;
  const pollMsRaw = flags['poll-ms'] !== undefined ? Number(flags['poll-ms']) : 100;
  const idleSleepMsRaw =
    flags['idle-sleep-ms'] !== undefined ? Number(flags['idle-sleep-ms']) : 500;

  if (!Number.isInteger(batchSizeRaw) || batchSizeRaw <= 0) {
    process.stderr.write('❌ --batch-size deve ser um inteiro positivo.\n');
    return 64;
  }
  if (!Number.isInteger(maxAttemptsRaw) || maxAttemptsRaw <= 0) {
    process.stderr.write('❌ --max-attempts deve ser um inteiro positivo.\n');
    return 64;
  }
  if (!Number.isInteger(pollMsRaw) || pollMsRaw <= 0) {
    process.stderr.write('❌ --poll-ms deve ser um inteiro positivo.\n');
    return 64;
  }
  if (!Number.isInteger(idleSleepMsRaw) || idleSleepMsRaw <= 0) {
    process.stderr.write('❌ --idle-sleep-ms deve ser um inteiro positivo.\n');
    return 64;
  }

  const consumerId =
    flags['consumer-id'] !== undefined && flags['consumer-id'] !== ''
      ? flags['consumer-id']
      : 'cli-logger-default';
  const logFile =
    flags['log-file'] !== undefined && flags['log-file'] !== '' ? flags['log-file'] : undefined;

  const config: WorkerConfig = {
    batchSize: batchSizeRaw,
    maxAttempts: maxAttemptsRaw,
    pollIntervalMs: pollMsRaw,
    idleSleepMs: idleSleepMsRaw,
  };

  // Construir LoggerEventDelivery com consumerId e logFile opcionais.
  const delivery = LoggerEventDelivery(consumerId, logFile);

  // Graceful shutdown via AbortController + SIGTERM/SIGINT.
  const controller = new AbortController();

  // Flag de teste: pré-aborta para que runLoop retorne imediatamente (CA-T3).
  const testAbort = 'test-abort' in flags;
  if (testAbort) {
    controller.abort();
  }

  const shutdown = (): void => {
    controller.abort();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  process.stdout.write(
    `[run-outbox-worker] Iniciando worker — batch=${config.batchSize}, maxAttempts=${config.maxAttempts}, pollMs=${config.pollIntervalMs}, idleMs=${config.idleSleepMs ?? config.pollIntervalMs}, consumer=${consumerId}\n`,
  );
  process.stdout.write('[run-outbox-worker] Pressione Ctrl+C para encerrar.\n');

  try {
    const stats = await runLoop(
      {
        outbox: ctx.outbox,
        delivery,
        clock: ctx.clock,
        abortSignal: controller.signal,
      },
      config,
    );

    process.stdout.write(`[run-outbox-worker] Worker shutdown — stats: ${JSON.stringify(stats)}\n`);
    return 0;
  } catch (cause) {
    process.stderr.write(`[run-outbox-worker] Erro fatal: ${String(cause)}\n`);
    return 1;
  } finally {
    // Remover listeners para não vazar em testes.
    process.off('SIGTERM', shutdown);
    process.off('SIGINT', shutdown);

    // Cleanup do outbox (pool separado, se houver).
    if (ctx.outboxCleanup !== undefined) {
      await ctx.outboxCleanup();
    }
  }
};
