/**
 * Plugin HTTP do módulo auth (ADR-0025/0028).
 *
 * Encapsula o sub-prefixo `/auth`; o composition root registra este plugin sob `/api/v2`
 * (resultando em `/api/v2/auth/*`). Exposto ao root apenas via `public-api/http.ts` (ADR-0006).
 *
 * Rota sentinela `__ping`: prova o wiring ponta-a-ponta e materializa o padrão Zod
 * contract-first (ADR-0027) que as rotas reais do H1 (register/login/refresh/logout)
 * replicam. Sentinela temporária — o H1 a remove. NÃO toca domain/application.
 */

import type { FastifyPluginAsync } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';
import * as z from 'zod/v4';

const pingResponse = z.object({
  pong: z.literal(true).meta({ description: 'Sentinela de saúde do plugin auth' }),
});

const authRoutes: FastifyPluginAsyncZodOpenApi = async (scope) => {
  scope.route({
    method: 'GET',
    url: '/__ping',
    schema: { response: { 200: pingResponse } } satisfies FastifyZodOpenApiSchema,
    handler: () => ({ pong: true as const }),
  });
};

export const authHttpPlugin: FastifyPluginAsync = async (app) => {
  await app
    .withTypeProvider<FastifyZodOpenApiTypeProvider>()
    .register(authRoutes, { prefix: '/auth' });
};
