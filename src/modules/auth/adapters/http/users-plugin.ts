/**
 * Plugin HTTP do recurso Users (spec 005 — ADR-0006/0025/0027/0028/0033/0037).
 *
 * Encapsula GET /users; o root registra sob /api/v1 -> GET /api/v1/users.
 * US1: listagem paginada administrativa (user:list, fail-closed).
 *
 * Padrao (fastify-server-expert; handbook/reference/fastify):
 *   - Encapsulation: plugin isolado por recurso; decorators/hooks no escopo do plugin.
 *   - preHandler [requireAuth, authorize('user:list')]: authn antes de authz.
 *   - Type Provider: wrapper externo withTypeProvider + register do plugin interno (zod-openapi).
 *   - Espelha src/modules/partners/adapters/http/supplier-plugin.ts.
 * ASCII puro.
 */

import type { FastifyPluginAsync, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';

import type { listUsers } from '../../application/use-cases/list-users.ts';
import type { getUser } from '../../application/use-cases/get-user.ts';
import type { UserStatusFilter } from '../../application/ports/user-query.ts';
import {
  userListQuerySchema,
  userListResponseSchema,
  userIdParamSchema,
  userDetailResponseSchema,
} from './users-schemas.ts';

export type UsersHttpDeps = Readonly<{
  /** Use cases ja instanciados pela composition — nao re-instanciar aqui. */
  listUsers: ReturnType<typeof listUsers>;
  getUser: ReturnType<typeof getUser>;
}>;

export type UsersHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

// Borda -> dominio: 'inactive' (spec HTTP) -> 'disabled' (UserStatusFilter).
const toStatusFilter = (httpStatus: 'active' | 'inactive' | 'all'): UserStatusFilter =>
  httpStatus === 'inactive' ? 'disabled' : httpStatus;

const USER_LIST_PERMISSION = 'user:list';
const USER_READ_PERMISSION = 'user:read';

const usersRoutes =
  (deps: UsersHttpDeps, hooks: UsersHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    // US1: GET /users — listagem paginada.
    scope.route({
      method: 'GET',
      url: '/users',
      preHandler: [hooks.requireAuth, hooks.authorize(USER_LIST_PERMISSION)],
      schema: {
        querystring: userListQuerySchema,
        response: { 200: userListResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const { page, pageSize, search, status } = req.query;

        // exactOptionalPropertyTypes: omitir `search` quando ausente (nao passar undefined).
        const result = await deps.listUsers({
          page,
          pageSize,
          status: toStatusFilter(status),
          ...(search !== undefined ? { search } : {}),
        });

        if (!result.ok) {
          return sendResult(reply, result, {
            errors: {
              'invalid-page': 422,
              'invalid-page-size': 422,
              'user-query-unavailable': 503,
            },
          });
        }

        return sendResult(reply, ok(result.value), { ok: 200 });
      },
    });

    // US2: GET /users/:id — detalhe.
    scope.route({
      method: 'GET',
      url: '/users/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(USER_READ_PERMISSION)],
      schema: {
        params: userIdParamSchema,
        response: { 200: userDetailResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getUser(req.params.id);
        return sendResult(reply, result, {
          ok: 200,
          errors: { 'user-id-invalid': 400, 'user-not-found': 404 },
        });
      },
    });
  };

export const usersHttpPlugin =
  (deps: UsersHttpDeps, hooks: UsersHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app.withTypeProvider<FastifyZodOpenApiTypeProvider>().register(usersRoutes(deps, hooks));
  };
