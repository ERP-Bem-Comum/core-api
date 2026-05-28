/**
 * buildApp — factory do servidor Fastify com hardening, Zod contract-first e OpenAPI 3.1.1.
 *
 * ADR-0025: HTTP é adapter de borda; dominio e application sem framework.
 * ADR-0027: Zod exclusivo nesta camada; OpenAPI gerado dos schemas; alvo 3.1.1.
 * ADR-0006: buildApp nao importa modulos — recebe plugins por injecao.
 */

import Fastify, {
  type FastifyBaseLogger,
  type FastifyInstance,
  type FastifyPluginAsync,
  type RawReplyDefaultExpression,
  type RawRequestDefaultExpression,
  type RawServerDefault,
} from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import {
  serializerCompiler,
  validatorCompiler,
  fastifyZodOpenApiPlugin,
  fastifyZodOpenApiTransformers,
  type FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';
import { randomUUID } from 'node:crypto';

import { runWithCorrelation } from '#src/shared/observability/correlation.ts';
import { installErrorHandlers } from '#src/shared/http/errors.ts';
import { readHttpConfig, type HttpConfig } from '#src/shared/http/config.ts';

/**
 * Tipo do servidor retornado por buildApp. Preserva o FastifyZodOpenApiTypeProvider
 * (aplicado por withTypeProvider) para que rotas H1+ tenham inferencia automatica
 * de schemas Zod sem reaplicar o provider.
 */
export type FastifyAppWithZod = FastifyInstance<
  RawServerDefault,
  RawRequestDefaultExpression,
  RawReplyDefaultExpression,
  FastifyBaseLogger,
  FastifyZodOpenApiTypeProvider
>;

export type BuildAppOptions = Readonly<{
  /** Plugins de rotas de negocio; registrados sob /api/v2. Default: []. */
  routes?: readonly FastifyPluginAsync[];
  /** Config HTTP (cors origins, rate-limit). Default: readHttpConfig({}) - origin: false, 200/min. */
  config?: HttpConfig;
}>;

/**
 * Opções do logger Pino com redact de credenciais (BE-050 — web-security-backend).
 * Função pura/testável: nenhum token, cookie ou secret deve aparecer em log.
 */
export const buildLoggerOptions = (
  env: Readonly<Record<string, string | undefined>>,
): Readonly<{ level: string; redact: readonly string[] }> => ({
  level: env['LOG_LEVEL'] ?? 'warn',
  redact: [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    'req.headers["x-api-key"]',
    '*.password',
    '*.token',
    '*.accessToken',
    '*.refreshToken',
    '*.secret',
  ],
});

export const buildApp = async (opts: BuildAppOptions = {}): Promise<FastifyAppWithZod> => {
  const config = opts.config ?? readHttpConfig({});
  const loggerOptions = buildLoggerOptions(process.env);
  const app = Fastify({
    logger: { level: loggerOptions.level, redact: [...loggerOptions.redact] },
    genReqId: (req): string => {
      const incomingId = req.headers['x-request-id'];
      if (typeof incomingId === 'string' && incomingId.length > 0) return incomingId;
      return randomUUID();
    },
    bodyLimit: 1_048_576, // 1 MiB
    trustProxy: config.trustProxy,
    requestTimeout: config.requestTimeout,
    keepAliveTimeout: config.keepAliveTimeout,
  }).withTypeProvider<FastifyZodOpenApiTypeProvider>();

  // --- Zod compiler (ADR-0027) ---
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // --- Plugins Zod+OpenAPI ---
  await app.register(fastifyZodOpenApiPlugin);

  // --- Hardening (helmet, cors, rate-limit) ---
  // helmet: cabecalhos de seguranca (CA4)
  await app.register(helmet, {
    contentSecurityPolicy: false, // gerenciado separadamente quando servir HTML
  });

  // cors: usa config.corsOrigins (vazio -> origin: false; allowlist -> lista de origens)
  await app.register(cors, {
    origin: config.corsOrigins.length > 0 ? [...config.corsOrigins] : false,
    credentials: true,
  });

  // rate-limit: usa config.rateLimitMax/Window (in-memory; producao sobrepoe com store Redis)
  await app.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitWindow,
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });

  // --- OpenAPI 3.1.1 (ADR-0027, CA6) ---
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.1',
      info: {
        title: 'core-api',
        description: 'ERP Bem Comum — core-api HTTP',
        version: '0.1.0',
      },
    },
    transform: fastifyZodOpenApiTransformers.transform,
    transformObject: fastifyZodOpenApiTransformers.transformObject,
  });

  // swagger-ui serve /docs e /docs/json (CA6)
  await app.register(swaggerUi, {
    routePrefix: '/docs',
  });

  // --- Hook onRequest: request-id → AsyncLocalStorage (ADR-0025:38) ---
  app.addHook('onRequest', (req, _reply, done) => {
    runWithCorrelation(req.id, done as () => void);
  });

  // --- Hook onSend: no-store em rotas de negocio /api/v2 (dado sensivel; sem cache em proxy/browser) ---
  app.addHook('onSend', (req, reply, payload, done) => {
    if (req.url.startsWith('/api/v2')) reply.header('cache-control', 'no-store');
    done(null, payload);
  });

  // --- Error handlers (CA2, CA5) ---
  installErrorHandlers(app);

  // --- Rota de infra: /health (CA1) ---
  app.get('/health', () => ({ status: 'ok' }));

  // --- Rotas de negocio sob /api/v2 (ADR-0025:35) ---
  const routes = opts.routes ?? [];
  for (const plugin of routes) {
    await app.register(plugin, { prefix: '/api/v2' });
  }

  return app;
};
