/**
 * Plugin HTTP do recurso Financiadores (ADR-0024/0025/0026/0028/0033). Encapsula `/financiers`;
 * o root registra sob `/api/v1`. Espelha `supplier-plugin.ts`. CRUD (fatia única): list+detalhe+
 * cadastro+deactivate/reactivate.
 */

import type {
  FastifyPluginAsync,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok, err } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';
import { toErrorEnvelope } from '#src/shared/http/errors.ts';
import { currentCorrelationId } from '#src/shared/observability/correlation.ts';

import type { PartnersHttpDeps } from './composition.ts';
import { financierToDetailDto } from './financier-dto.ts';
import { queryToFilter, paginateRecords } from './financier-list-query.ts';
import {
  financierListQuerySchema,
  financierPaginatedSchema,
  financierDetailSchema,
  financierIdParamSchema,
  createFinancierBodySchema,
  updateFinancierBodySchema,
} from './financier-schemas.ts';
import { FINANCIER_PERMISSION } from '../../public-api/permissions.ts';

export type FinanciersHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
  /** Checagem consultável de permissão (RBAC condicional do campo vital — edição). */
  hasPermission: (req: FastifyRequest, permissionName: string) => Promise<boolean>;
}>;

const SENSITIVE_PERMISSION = 'financier:edit-sensitive';

const CONFLICT_CODES: ReadonlySet<string> = new Set([
  'register-financier-cnpj-duplicate',
  'financier-cnpj-duplicate',
  'edit-financier-cnpj-duplicate',
  'financier-already-inactive',
  'financier-already-active',
]);
const NOT_FOUND_CODES: ReadonlySet<string> = new Set([
  'deactivate-financier-not-found',
  'reactivate-financier-not-found',
  'edit-financier-not-found',
]);
const BAD_REQUEST_CODES: ReadonlySet<string> = new Set([
  'deactivate-financier-invalid-id',
  'reactivate-financier-invalid-id',
  'edit-financier-invalid-id',
]);
const FORBIDDEN_CODES: ReadonlySet<string> = new Set(['edit-financier-sensitive-forbidden']);
const REPO_UNAVAILABLE_CODES: ReadonlySet<string> = new Set(['financier-repo-unavailable']);

// Erro de escrita → status. Default 422 (invariante de domínio: campos obrigatórios, CNPJ).
const writeErrorStatus = (code: string): number => {
  if (FORBIDDEN_CODES.has(code)) return 403;
  if (CONFLICT_CODES.has(code)) return 409;
  if (NOT_FOUND_CODES.has(code)) return 404;
  if (BAD_REQUEST_CODES.has(code)) return 400;
  if (REPO_UNAVAILABLE_CODES.has(code)) return 503;
  return 422;
};

const sendWriteError = (reply: FastifyReply, code: string): Promise<void> => {
  const requestId = currentCorrelationId() ?? reply.request.id;
  return reply
    .code(writeErrorStatus(code))
    .send(toErrorEnvelope(code, code, requestId)) as unknown as Promise<void>;
};

const financiersRoutes =
  (deps: PartnersHttpDeps, hooks: FinanciersHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    scope.route({
      method: 'GET',
      url: '/financiers',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIER_PERMISSION.read)],
      schema: {
        querystring: financierListQuerySchema,
        response: { 200: financierPaginatedSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listFinancierRecords();
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'financier-read-unavailable': 503 },
          });
        }
        const page = paginateRecords(result.value, queryToFilter(req.query), req.query);
        return sendResult(
          reply,
          ok({ items: page.items.map(financierToDetailDto), meta: page.meta }),
          { ok: 200 },
        );
      },
    });

    scope.route({
      method: 'GET',
      url: '/financiers/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIER_PERMISSION.read)],
      schema: {
        params: financierIdParamSchema,
        response: { 200: financierDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getFinancierById(req.params.id);
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'financier-read-unavailable': 503 },
          });
        }
        if (result.value === null) {
          return sendResult(reply, err('financier-not-found'), {
            errors: { 'financier-not-found': 404 },
          });
        }
        return sendResult(reply, ok(financierToDetailDto(result.value)), { ok: 200 });
      },
    });

    scope.route({
      method: 'POST',
      url: '/financiers',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIER_PERMISSION.write)],
      schema: {
        body: createFinancierBodySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.registerFinancier(req.body);
        if (!result.ok) return sendWriteError(reply, result.error);
        const id = String(result.value.financier.id);
        return reply
          .code(201)
          .header('location', `/api/v1/financiers/${id}`)
          .send() as unknown as Promise<void>;
      },
    });

    scope.route({
      method: 'POST',
      url: '/financiers/:id/deactivate',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIER_PERMISSION.write)],
      schema: {
        params: financierIdParamSchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.deactivateFinancier({ financierId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });

    scope.route({
      method: 'POST',
      url: '/financiers/:id/reactivate',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIER_PERMISSION.write)],
      schema: {
        params: financierIdParamSchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.reactivateFinancier({ financierId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });

    // Edição (PUT total). `financier:write` edita campos não-vitais; mudar o CNPJ (vital) exige
    // `financier:edit-sensitive` — a regra do vital é aplicada no use case (canEditSensitive).
    scope.route({
      method: 'PUT',
      url: '/financiers/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(FINANCIER_PERMISSION.write)],
      schema: {
        params: financierIdParamSchema,
        body: updateFinancierBodySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const canEditSensitive = await hooks.hasPermission(req, SENSITIVE_PERMISSION);
        const result = await deps.editFinancier({
          financierId: req.params.id,
          canEditSensitive,
          ...req.body,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });
  };

export const financiersHttpPlugin =
  (deps: PartnersHttpDeps, hooks: FinanciersHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app
      .withTypeProvider<FastifyZodOpenApiTypeProvider>()
      .register(financiersRoutes(deps, hooks));
  };
