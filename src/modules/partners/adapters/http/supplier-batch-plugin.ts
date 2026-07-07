/**
 * Plugin HTTP do endpoint de resolução em lote de Fornecedores (#356; ADR-0049 §3 /
 * card #350). `POST /partners/suppliers:batch` — greenfield, montado sob `/api/v2`
 * (default do `buildApp`). Resolve N refs em 1 chamada (anti-N+1 do lado do BFF) e
 * devolve identidade MÍNIMA (nome/CNPJ/categoria) — NUNCA bancário/PIX (minimização,
 * CA5). Rota estática `:batch` — sem `/:id` neste plugin, então não há ambiguidade
 * de ordenação com o Fastify router. Espelha `supplier-plugin.ts`.
 */

import type { FastifyPluginAsync, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok, err } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';

import type { PartnersHttpDeps } from './composition.ts';
import { suppliersBatchBodySchema, suppliersBatchResponseSchema } from './supplier-schemas.ts';
import { SUPPLIER_PERMISSION } from '../../public-api/permissions.ts';

export type SuppliersBatchHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

const suppliersBatchRoutes =
  (deps: PartnersHttpDeps, hooks: SuppliersBatchHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    scope.route({
      method: 'POST',
      url: '/partners/suppliers:batch',
      preHandler: [hooks.requireAuth, hooks.authorize(SUPPLIER_PERMISSION.read)],
      schema: {
        body: suppliersBatchBodySchema,
        response: { 200: suppliersBatchResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getSuppliersView(req.body.refs);
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'suppliers-batch-read-unavailable': 503 },
          });
        }
        return sendResult(reply, ok(result.value), { ok: 200 });
      },
    });
  };

export const suppliersBatchHttpPlugin =
  (deps: PartnersHttpDeps, hooks: SuppliersBatchHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(suppliersBatchRoutes(deps, hooks));
  };
