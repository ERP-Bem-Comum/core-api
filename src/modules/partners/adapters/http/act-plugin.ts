/**
 * Plugin HTTP do recurso Acts (ADR-0024/0025/0026/0028/0033). Encapsula `/acts`;
 * o root registra sob `/api/v1`. Espelha `supplier-plugin.ts` / `plugin.ts` (collaborators).
 *
 * Rotas:
 *   POST   /acts              → 201 + Location (cadastro, act:write)
 *   GET    /acts              → 200 lista paginada (act:read)
 *   GET    /acts/:id          → 200 detalhe (act:read)
 *   PUT    /acts/:id          → 200 edição total (act:write)
 *   POST   /acts/:id/deactivate  → 200 soft-delete (act:write)
 *   POST   /acts/:id/reactivate  → 200 reativação (act:write)
 */

import type { FastifyPluginAsync, FastifyReply, preHandlerAsyncHookHandler } from 'fastify';
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
import { actToDetailDto } from './act-dto.ts';
import {
  actListQuerySchema,
  actPaginatedSchema,
  actDetailSchema,
  actIdParamSchema,
  createActBodySchema,
  updateActBodySchema,
} from './act-schemas.ts';
import { queryToFilter as actQueryToFilter, actsForExport } from './act-list-query.ts';
import { actMatchesFilter } from '../../application/use-cases/list-acts.ts';
import { actsToCsv } from '../export/act-csv.ts';
import { ACT_PERMISSION } from '../../public-api/permissions.ts';

export type ActsHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  /** Fábrica de preHandler RBAC por nome de permissão (auth/public-api). */
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

// Conflito de estado/unicidade → 409.
const CONFLICT_CODES: ReadonlySet<string> = new Set([
  'register-act-number-duplicate',
  'edit-act-number-duplicate',
  'act-number-duplicate',
  'act-already-inactive',
  'act-already-active',
]);
const NOT_FOUND_CODES: ReadonlySet<string> = new Set([
  'deactivate-act-not-found',
  'reactivate-act-not-found',
  'edit-act-not-found',
]);
const BAD_REQUEST_CODES: ReadonlySet<string> = new Set([
  'deactivate-act-invalid-id',
  'reactivate-act-invalid-id',
  'edit-act-invalid-id',
]);
const REPO_UNAVAILABLE_CODES: ReadonlySet<string> = new Set(['act-repo-unavailable']);

// Erro de escrita → status. Default 422 (invariante de domínio: cnpj/repasse/vigência/enum inválidos).
const writeErrorStatus = (code: string): number => {
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

const actsRoutes =
  (deps: PartnersHttpDeps, hooks: ActsHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    // Lista paginada. Filtro simples (search/active) composto na borda.
    scope.route({
      method: 'GET',
      url: '/acts',
      preHandler: [hooks.requireAuth, hooks.authorize(ACT_PERMISSION.read)],
      schema: {
        querystring: actListQuerySchema,
        response: { 200: actPaginatedSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listActRecords();
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'act-read-unavailable': 503 },
          });
        }
        const q = req.query;
        const filter = actQueryToFilter(q);
        const filtered = result.value.filter((r) => actMatchesFilter(r.act, filter));
        const direction = q.order === 'DESC' ? -1 : 1;
        filtered.sort((a, b) => a.act.name.localeCompare(b.act.name) * direction);
        const totalItems = filtered.length;
        const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / q.limit);
        const start = (q.page - 1) * q.limit;
        const items = filtered.slice(start, start + q.limit);
        const counts = await deps.getContractCounts(items.map((r) => String(r.act.id)));
        if (!counts.ok) {
          return sendResult(reply, err(counts.error), {
            errors: { 'contract-count-store-unavailable': 503 },
          });
        }
        return sendResult(
          reply,
          ok({
            items: items.map((r) => actToDetailDto(r, counts.value.get(String(r.act.id)) ?? 0)),
            meta: {
              itemCount: items.length,
              totalItems,
              itemsPerPage: q.limit,
              totalPages,
              currentPage: q.page,
            },
          }),
          { ok: 200 },
        );
      },
    });

    // Export CSV (US-002 / spec 003): filtra (search/active) e serializa via util compartilhado.
    // Rota estática tem precedência sobre `/:id`. `act:read`.
    scope.route({
      method: 'GET',
      url: '/acts/export',
      preHandler: [hooks.requireAuth, hooks.authorize(ACT_PERMISSION.read)],
      schema: {
        querystring: actListQuerySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.listActRecords();
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'act-read-unavailable': 503 },
          });
        }
        const csv = actsToCsv(actsForExport(result.value, actQueryToFilter(req.query)));
        return reply
          .code(200)
          .header('content-type', 'text/csv; charset=utf-8')
          .header('content-disposition', 'attachment; filename="acts.csv"')
          .header('x-content-type-options', 'nosniff')
          .send(csv) as unknown as Promise<void>;
      },
    });

    // Detalhe: :id é UUID (Zod → 400); inexistente → 404; reader indisponível → 503.
    scope.route({
      method: 'GET',
      url: '/acts/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(ACT_PERMISSION.read)],
      schema: {
        params: actIdParamSchema,
        response: { 200: actDetailSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getActById(req.params.id);
        if (!result.ok) {
          return sendResult(reply, err(result.error), {
            errors: { 'act-read-unavailable': 503 },
          });
        }
        if (result.value === null) {
          return sendResult(reply, err('act-not-found'), {
            errors: { 'act-not-found': 404 },
          });
        }
        const contractorRef = String(result.value.act.id);
        const counts = await deps.getContractCounts([contractorRef]);
        if (!counts.ok) {
          return sendResult(reply, err(counts.error), {
            errors: { 'contract-count-store-unavailable': 503 },
          });
        }
        return sendResult(
          reply,
          ok(actToDetailDto(result.value, counts.value.get(contractorRef) ?? 0)),
          { ok: 200 },
        );
      },
    });

    // Cadastro: cria pré-cadastro. 201 + Location (sem corpo).
    scope.route({
      method: 'POST',
      url: '/acts',
      preHandler: [hooks.requireAuth, hooks.authorize(ACT_PERMISSION.write)],
      schema: {
        body: createActBodySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.registerAct(req.body);
        if (!result.ok) return sendWriteError(reply, result.error);
        const id = String(result.value.act.id);
        return reply
          .code(201)
          .header('location', `/api/v1/acts/${id}`)
          .send() as unknown as Promise<void>;
      },
    });

    // Edição cadastral (PUT total dos 7 campos; status preservado).
    scope.route({
      method: 'PUT',
      url: '/acts/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(ACT_PERMISSION.write)],
      schema: {
        params: actIdParamSchema,
        body: updateActBodySchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.editAct({
          actId: req.params.id,
          ...req.body,
        });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });

    // Desativar: Active → Inactive (soft-delete simples, sem disableBy).
    scope.route({
      method: 'POST',
      url: '/acts/:id/deactivate',
      preHandler: [hooks.requireAuth, hooks.authorize(ACT_PERMISSION.write)],
      schema: {
        params: actIdParamSchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.deactivateAct({ actId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });

    // Reativar: Inactive → Active.
    scope.route({
      method: 'POST',
      url: '/acts/:id/reactivate',
      preHandler: [hooks.requireAuth, hooks.authorize(ACT_PERMISSION.write)],
      schema: {
        params: actIdParamSchema,
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.reactivateAct({ actId: req.params.id });
        if (!result.ok) return sendWriteError(reply, result.error);
        return reply.code(200).send() as unknown as Promise<void>;
      },
    });
  };

export const actHttpPlugin =
  (deps: PartnersHttpDeps, hooks: ActsHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app.withTypeProvider<FastifyZodOpenApiTypeProvider>().register(actsRoutes(deps, hooks));
  };
