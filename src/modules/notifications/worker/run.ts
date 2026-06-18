// Entrypoint standalone do worker de e-mail do `notifications` (ADR-0015).
// Molde: `partners/worker/run.ts`. Abre o pool MySQL próprio do módulo
// (`openNotificationsMysql`), constrói o EmailSender a partir do SMTP (env) e roda
// `runLoop`. Processo dedicado, foreground, encerrado por SIGTERM/SIGINT.
//
// Migrations: o worker NÃO as aplica (`applyMigrations: false`) — responsabilidade do release.

import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import {
  parseSmtpConfig,
  createNodemailerEmailSender,
} from '#src/modules/notifications/public-api/index.ts';
import { openNotificationsMysql } from '../adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleEmailOutbox } from '../adapters/outbox/email-outbox.drizzle.ts';
import { EmailSenderDelivery } from '../adapters/event-delivery/event-delivery.email-sender.ts';
import { runLoop } from './outbox-worker.ts';
import { readWorkerConfig } from './config.ts';

const EX_CONFIG = 78; // sysexits.h — erro de configuração.

const main = async (): Promise<number> => {
  const configR = readWorkerConfig(process.env);
  if (!configR.ok) {
    process.stderr.write(`[notifications-email-worker] configuração inválida: ${configR.error}\n`);
    return EX_CONFIG;
  }
  const config = configR.value;

  // EmailSender real a partir do SMTP (env). Sem SMTP válido o worker não entrega.
  const smtpR = parseSmtpConfig(process.env);
  if (!smtpR.ok) {
    process.stderr.write(
      `[notifications-email-worker] SMTP inválido: ${JSON.stringify(smtpR.error)}\n`,
    );
    return EX_CONFIG;
  }
  const sender = createNodemailerEmailSender(smtpR.value);

  const handleR = await openNotificationsMysql({
    connectionString: config.connectionString,
    applyMigrations: false,
  });
  if (!handleR.ok) {
    process.stderr.write(`[notifications-email-worker] falha ao abrir MySQL: ${handleR.error}\n`);
    return 1;
  }
  const handle = handleR.value;
  const outbox = createDrizzleEmailOutbox(handle);
  const delivery = EmailSenderDelivery(sender, config.consumerId);

  const controller = new AbortController();
  const shutdown = (): void => {
    controller.abort();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  process.stderr.write(
    `[notifications-email-worker] iniciando — batch=${config.loop.batchSize} ` +
      `maxAttempts=${config.loop.maxAttempts} pollMs=${config.loop.pollIntervalMs} ` +
      `consumer=${config.consumerId}\n`,
  );

  try {
    const stats = await runLoop(
      { outbox, delivery, clock: ClockReal(), abortSignal: controller.signal },
      config.loop,
    );
    process.stderr.write(
      `[notifications-email-worker] shutdown limpo — stats: ${JSON.stringify(stats)}\n`,
    );
    return 0;
  } catch (cause) {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`[notifications-email-worker] erro fatal: ${detail}\n`);
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
    process.stderr.write(`[notifications-email-worker] rejeição não tratada no main: ${detail}\n`);
    process.exitCode = 1;
  });
