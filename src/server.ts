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
import { authHttpPlugin } from '#src/modules/auth/public-api/http.ts';

const main = async (): Promise<void> => {
  const config = readHttpConfig(process.env);

  const app = await buildApp({ routes: [authHttpPlugin], config });

  // Graceful shutdown: SIGTERM / SIGINT → app.close() (drena conexoes abertas)
  const shutdown = async (): Promise<void> => {
    app.log.info('Graceful shutdown iniciado…');
    await app.close();
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
