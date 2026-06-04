/**
 * Entrypoint HTTP — lê config, sobe Fastify, graceful shutdown.
 *
 * Composicao dos adapters de modulo (ex.: auth) sera feita aqui quando
 * cada modulo exportar seu plugin via <modulo>/public-api/http.ts (ADR-0006).
 */

import process from 'node:process';

import { buildApp } from '#src/shared/http/app.ts';
import { readHttpConfig } from '#src/shared/http/config.ts';
import {
  installLastResortHandlers,
  processLastResortDeps,
} from '#src/shared/runtime/last-resort.ts';
import {
  authHttpPlugin,
  buildAuthHttpDeps,
  makeRequireAuth,
  parseE2eAuthSeed,
} from '#src/modules/auth/public-api/http.ts';
import {
  contractsHttpPlugin,
  buildContractsHttpDeps,
} from '#src/modules/contracts/public-api/http.ts';
import {
  collaboratorsHttpPlugin,
  suppliersHttpPlugin,
  financiersHttpPlugin,
  buildPartnersHttpDeps,
} from '#src/modules/partners/public-api/http.ts';

const main = async (): Promise<void> => {
  const config = readHttpConfig(process.env);

  const authDriver = process.env['AUTH_DRIVER'] === 'mysql' ? 'mysql' : 'memory';
  const authConnString = process.env['AUTH_DATABASE_URL'];
  // Seed RBAC via env — inerte fora de E2E/dev (guarda dupla CORE_API_E2E + AUTH_SEED_JSON).
  const authSeed = parseE2eAuthSeed(process.env);
  // BE-REC-001: limite dedicado de login/refresh via env; ausente/malformado → default (5/min).
  const sensitiveMax = Number.parseInt(process.env['AUTH_LOGIN_RATE_LIMIT_MAX'] ?? '', 10);
  const sensitiveRateLimit =
    Number.isInteger(sensitiveMax) && sensitiveMax > 0
      ? {
          max: sensitiveMax,
          timeWindow: process.env['AUTH_LOGIN_RATE_LIMIT_WINDOW'] ?? '1 minute',
        }
      : undefined;
  // BE-REC-003: origem confiável do link de reset (nunca header Host). Ausente → default (dev).
  const resetBaseUrl = process.env['AUTH_RESET_BASE_URL'];
  const authDeps = await buildAuthHttpDeps({
    driver: authDriver,
    ...(authConnString !== undefined ? { connectionString: authConnString } : {}),
    ...(authSeed !== undefined ? { seed: authSeed } : {}),
    ...(sensitiveRateLimit !== undefined ? { sensitiveRateLimit } : {}),
    ...(resetBaseUrl !== undefined && resetBaseUrl.length > 0 ? { resetBaseUrl } : {}),
  });

  // RW split (ADR-0026): CONTRACTS_DATABASE_URL = writer; CONTRACTS_READER_URL = réplica
  // (ausente → reusa o writer, single-node). Reads roteiam ao reader.
  const contractsWriterUrl = process.env['CONTRACTS_DATABASE_URL'];
  const contractsReaderUrl = process.env['CONTRACTS_READER_URL'];
  const contractsDeps = await buildContractsHttpDeps(
    process.env['CONTRACTS_DRIVER'] === 'mysql'
      ? {
          driver: 'mysql',
          ...(contractsWriterUrl !== undefined ? { writerUrl: contractsWriterUrl } : {}),
          ...(contractsReaderUrl !== undefined ? { readerUrl: contractsReaderUrl } : {}),
        }
      : { driver: 'memory' },
  );

  // RW split (ADR-0026) do módulo partners: PARTNERS_DATABASE_URL = writer; PARTNERS_READER_URL
  // = réplica (ausente → reusa o writer). Reads (lista de colaboradores) roteiam ao reader.
  const partnersWriterUrl = process.env['PARTNERS_DATABASE_URL'];
  const partnersReaderUrl = process.env['PARTNERS_READER_URL'];
  const partnersDeps = await buildPartnersHttpDeps(
    process.env['PARTNERS_DRIVER'] === 'mysql'
      ? {
          driver: 'mysql',
          ...(partnersWriterUrl !== undefined ? { writerUrl: partnersWriterUrl } : {}),
          ...(partnersReaderUrl !== undefined ? { readerUrl: partnersReaderUrl } : {}),
        }
      : { driver: 'memory' },
  );

  // requireAuth do auth (cross-módulo via public-api, ADR-0006/0024) protege as rotas de contracts.
  const requireAuth = makeRequireAuth(authDeps.verifyAccessToken);

  const app = await buildApp({
    routes: [
      // Modelo novo (greenfield) → /api/v2 (plugin direto, forma legada do buildApp).
      authHttpPlugin(authDeps),
      contractsHttpPlugin(contractsDeps, { requireAuth, authorize: authDeps.authorize }),
      // Espelho do legado (ADR-0033) → /api/v1.
      {
        plugin: collaboratorsHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
          hasPermission: authDeps.hasPermission,
        }),
        prefix: '/api/v1',
      },
      {
        plugin: suppliersHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
          hasPermission: authDeps.hasPermission,
        }),
        prefix: '/api/v1',
      },
      {
        plugin: financiersHttpPlugin(partnersDeps, {
          requireAuth,
          authorize: authDeps.authorize,
          hasPermission: authDeps.hasPermission,
        }),
        prefix: '/api/v1',
      },
    ],
    config,
  });

  // Graceful shutdown: SIGTERM / SIGINT → app.close() (drena conexoes abertas)
  const shutdown = async (): Promise<void> => {
    app.log.info('Graceful shutdown iniciado…');
    await app.close();
    await authDeps.shutdown();
    await contractsDeps.shutdown();
    await partnersDeps.shutdown();
    app.log.info('Servidor encerrado.');
  };

  const onSignal = (): void => {
    void shutdown().catch((err: unknown) => {
      process.stderr.write(`Erro no shutdown: ${String(err)}\n`);
      process.exit(1);
    });
  };

  process.on('SIGTERM', onSignal);
  process.on('SIGINT', onSignal);

  // Handlers de ultimo recurso para erros fora da cadeia de promise
  installLastResortHandlers(shutdown, processLastResortDeps());

  await app.listen({ port: config.port, host: config.host });
  app.log.info(`core-api HTTP listening on ${config.host}:${config.port}`);
};

main().catch((err: unknown) => {
  process.stderr.write(`Fatal ao iniciar: ${String(err)}\n`);
  process.exit(1);
});
