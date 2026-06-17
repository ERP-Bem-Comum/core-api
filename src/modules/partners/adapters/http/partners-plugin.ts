/**
 * Plugin Fastify do agregador `GET /api/v1/partners` (003-partners-aggregator-export).
 * Lê os 4 readers em paralelo (`Promise.all`), compõe via `aggregatePartners` (projeção plana +
 * merge + sort + paginação + cap) e responde paginado. Espelha `supplier-plugin.ts`.
 *
 * Autorização = AND das 4 permissões de leitura: `authorize` é single-perm, então os 4 guards
 * são preHandlers ENCADEADOS (o 1º que falhar corta com 403). Quem consome o seletor de contratado
 * (feature 002) pode contratar qualquer tipo → deve ler os 4.
 */

import type { FastifyPluginAsync, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok, err } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';

import type { PartnersHttpDeps } from './composition.ts';
import { aggregatePartners } from './partner-aggregate-query.ts';
import { partnersAggregateQuerySchema, partnersPaginatedSchema } from './partners-schemas.ts';
import {
  SUPPLIER_PERMISSION,
  FINANCIER_PERMISSION,
  COLLABORATOR_PERMISSION,
  ACT_PERMISSION,
} from '../../public-api/permissions.ts';

export type PartnersHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
  hasPermission: (req: FastifyRequest, permissionName: string) => Promise<boolean>;
}>;

const partnersRoutes =
  (deps: PartnersHttpDeps, hooks: PartnersHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    scope.route({
      method: 'GET',
      url: '/partners',
      // AND das 4 reads: preHandlers encadeados (1º 403 corta).
      preHandler: [
        hooks.requireAuth,
        hooks.authorize(SUPPLIER_PERMISSION.read),
        hooks.authorize(FINANCIER_PERMISSION.read),
        hooks.authorize(COLLABORATOR_PERMISSION.read),
        hooks.authorize(ACT_PERMISSION.read),
      ],
      schema: {
        querystring: partnersAggregateQuerySchema,
        response: { 200: partnersPaginatedSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const [suppliers, financiers, collaborators, acts] = await Promise.all([
          deps.listSupplierRecords(),
          deps.listFinancierRecords(),
          deps.listCollaboratorRecords(),
          deps.listActRecords(),
        ]);
        if (!suppliers.ok)
          return sendResult(reply, err(suppliers.error), {
            errors: { 'supplier-read-unavailable': 503 },
          });
        if (!financiers.ok)
          return sendResult(reply, err(financiers.error), {
            errors: { 'financier-read-unavailable': 503 },
          });
        if (!collaborators.ok)
          return sendResult(reply, err(collaborators.error), {
            errors: { 'collaborator-read-unavailable': 503 },
          });
        if (!acts.ok)
          return sendResult(reply, err(acts.error), {
            errors: { 'act-read-unavailable': 503 },
          });

        const result = aggregatePartners(
          {
            suppliers: suppliers.value,
            financiers: financiers.value,
            collaborators: collaborators.value,
            acts: acts.value,
          },
          req.query,
        );
        if (!result.ok) {
          return sendResult(reply, result, { errors: { 'partners-aggregate-too-large': 503 } });
        }
        // Enriquece só a PÁGINA (≤ limit) com a contagem do read-model (batch, anti-N+1; #107).
        const counts = await deps.getContractCounts(result.value.items.map((it) => it.id));
        if (!counts.ok) {
          return sendResult(reply, err(counts.error), {
            errors: { 'contract-count-store-unavailable': 503 },
          });
        }
        const items = result.value.items.map((it) => ({
          ...it,
          contractCount: counts.value.get(it.id) ?? 0,
        }));
        return sendResult(reply, ok({ items, meta: result.value.meta }), { ok: 200 });
      },
    });
  };

export const partnersHttpPlugin =
  (deps: PartnersHttpDeps, hooks: PartnersHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(partnersRoutes(deps, hooks));
  };
