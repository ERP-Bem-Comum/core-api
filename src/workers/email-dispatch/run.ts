// Entrypoint standalone do worker de envio de e-mail transacional (NOTIF-EMAIL-EVENT-CONSUMER /
// ADR-0047 fatia 02) — COMPOSITION ROOT.
//
// Le o `auth_outbox` (pool do `auth`) E o `par_email_outbox` (pool do `partners`) e entrega os
// eventos de e-mail transacional (`PasswordResetRequested`/`UserInvited`/`CollaboratorInvited`) ao
// consumidor do `notifications` (decode via {auth,partners}/public-api -> template -> EmailSender.send),
// via o worker generico (`shared/outbox`). MULTI-FONTE (PARTNERS-INVITE-DOMAIN-EVENT / ADR-0047): dois
// `runLoop` concorrentes compartilham o MESMO `EventDelivery` de e-mail. Dois pools, um processo
// dedicado (ADR-0041); nenhum modulo importa o outro — a ligacao e aqui.
//
// Config por env: AUTH_DATABASE_URL (le o auth_outbox) + PARTNERS_DATABASE_URL (le o par_email_outbox)
// + config de e-mail (EMAIL_PROVIDER / from resolvido por `parseEmailConfig`+`resolveFrom`). Se
// PARTNERS_DATABASE_URL ausente, o worker roda so a fonte auth (degradacao graciosa). Migrations NAO
// sao aplicadas aqui (responsabilidade do release). Encerrado por SIGTERM/SIGINT (graceful — Node 24).

import process from 'node:process';

import { ClockReal } from '#src/shared/adapters/clock-real.ts';
import { runLoop } from '#src/shared/outbox/index.ts';
import { openAuthMysql } from '#src/modules/auth/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleAuthOutboxRepository } from '#src/modules/auth/adapters/persistence/repos/outbox-repository.drizzle.ts';
import {
  openPartnersMysql,
  type PartnersMysqlHandle,
} from '#src/modules/partners/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleParEmailOutboxRepository } from '#src/modules/partners/adapters/persistence/repos/email-outbox-repository.drizzle.ts';
import {
  buildEmailSender,
  parseEmailConfig,
  resolveFrom,
} from '#src/modules/notifications/public-api/index.ts';
import { buildEmailDispatchDelivery, rowToEmailRow } from './delivery.ts';

const EX_CONFIG = 78; // sysexits.h — erro de configuracao.
const TAG = '[email-dispatch-worker] ';

const main = async (): Promise<number> => {
  const authUrl = process.env['AUTH_DATABASE_URL'];
  if (authUrl === undefined || authUrl.length === 0) {
    process.stderr.write(`${TAG}AUTH_DATABASE_URL e obrigatorio\n`);
    return EX_CONFIG;
  }

  // Config de e-mail: remetente (reset usa o mesmo from base) + provider por deploy.
  const config = parseEmailConfig(process.env);
  if (!config.ok) {
    process.stderr.write(`${TAG}config de e-mail invalida (${config.error.tag})\n`);
    return EX_CONFIG;
  }
  // Ambos os e-mails (reset/invite) compartilham o mesmo from base se nao houver override.
  const from = resolveFrom('reset', config.value) ?? resolveFrom('invite', config.value);
  if (from === undefined) {
    process.stderr.write(`${TAG}remetente (EMAIL_FROM) nao configurado\n`);
    return EX_CONFIG;
  }

  const senderR = buildEmailSender(process.env);
  if (!senderR.ok) {
    process.stderr.write(`${TAG}provider de e-mail invalido (${senderR.error.tag})\n`);
    return EX_CONFIG;
  }

  const authR = await openAuthMysql({ connectionString: authUrl, applyMigrations: false });
  if (!authR.ok) {
    process.stderr.write(`${TAG}falha ao abrir MySQL (auth): ${authR.error}\n`);
    return 1;
  }

  const authHandle = authR.value;
  const clock = ClockReal();
  const authOutbox = createDrizzleAuthOutboxRepository(authHandle);
  // O MESMO EventDelivery serve as duas fontes (multi-fonte — ADR-0047): decodifica por eventType.
  const delivery = buildEmailDispatchDelivery({ emailSender: senderR.value, from });

  // PARTNERS-INVITE-DOMAIN-EVENT (ADR-0047): segunda fonte par_email_outbox (opcional). Sem
  // PARTNERS_DATABASE_URL, o worker roda so a fonte auth (degradacao graciosa).
  const partnersUrl = process.env['PARTNERS_DATABASE_URL'];
  let partnersHandle: PartnersMysqlHandle | null = null;
  if (partnersUrl !== undefined && partnersUrl.length > 0) {
    const partnersR = await openPartnersMysql({
      connectionString: partnersUrl,
      applyMigrations: false,
    });
    if (!partnersR.ok) {
      process.stderr.write(`${TAG}falha ao abrir MySQL (partners): ${partnersR.error}\n`);
      await authHandle.close();
      return 1;
    }
    partnersHandle = partnersR.value;
  } else {
    process.stderr.write(`${TAG}PARTNERS_DATABASE_URL ausente — rodando so a fonte auth\n`);
  }

  const controller = new AbortController();
  const shutdown = (): void => {
    controller.abort();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  process.stderr.write(
    `${TAG}iniciando — auth_outbox${partnersHandle !== null ? ' + par_email_outbox' : ''} -> EmailSender\n`,
  );

  const loopConfig = { batchSize: 10, maxAttempts: 5, pollIntervalMs: 500, idleSleepMs: 1000 };

  try {
    const loops: Promise<unknown>[] = [
      runLoop(
        {
          outbox: authOutbox,
          delivery,
          rowToProcessed: rowToEmailRow,
          clock,
          tag: `${TAG}[auth] `,
          abortSignal: controller.signal,
        },
        loopConfig,
      ),
    ];
    if (partnersHandle !== null) {
      const partnersOutbox = createDrizzleParEmailOutboxRepository(partnersHandle);
      loops.push(
        runLoop(
          {
            outbox: partnersOutbox,
            delivery,
            rowToProcessed: rowToEmailRow,
            clock,
            tag: `${TAG}[partners] `,
            abortSignal: controller.signal,
          },
          loopConfig,
        ),
      );
    }
    const stats = await Promise.all(loops);
    process.stderr.write(`${TAG}shutdown limpo — stats: ${JSON.stringify(stats)}\n`);
    return 0;
  } catch (cause) {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`${TAG}erro fatal: ${detail}\n`);
    return 1;
  } finally {
    process.off('SIGTERM', shutdown);
    process.off('SIGINT', shutdown);
    await authHandle.close();
    if (partnersHandle !== null) await partnersHandle.close();
  }
};

await main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((cause: unknown) => {
    const detail = cause instanceof Error ? (cause.stack ?? cause.message) : String(cause);
    process.stderr.write(`${TAG}rejeicao nao tratada no main: ${detail}\n`);
    process.exitCode = 1;
  });
