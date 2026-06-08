/**
 * Plugin HTTP da Gestao de Acessos (spec 006 — ADR-0006/0025/0027/0028).
 *
 * Encapsula as rotas RBAC administrativas; o root registra sob /api/v1. Reusado pelas US2-US7;
 * nesta US1 expoe apenas GET /users/:id/permissions (permissoes efetivas — permission role:read).
 *
 * Padrao (fastify-server-expert; handbook/reference/fastify): espelha users-plugin.ts —
 * encapsulation por recurso, preHandler [requireAuth, authorize] (authn antes de authz), type
 * provider via wrapper externo withTypeProvider + register do plugin interno. ASCII puro.
 */

import type { FastifyPluginAsync, preHandlerAsyncHookHandler } from 'fastify';
import type {
  FastifyPluginAsyncZodOpenApi,
  FastifyZodOpenApiSchema,
  FastifyZodOpenApiTypeProvider,
} from 'fastify-zod-openapi';

import { ok } from '#src/shared/primitives/result.ts';
import { sendResult } from '#src/shared/http/reply.ts';

import type { getUserPermissions } from '../../application/use-cases/get-user-permissions.ts';
import { userPermissionsParamSchema, userPermissionsResponseSchema } from './roles-schemas.ts';

export type RolesHttpDeps = Readonly<{
  /** Use cases ja instanciados pela composition — nao re-instanciar aqui. */
  getUserPermissions: ReturnType<typeof getUserPermissions>;
}>;

export type RolesHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

const ROLE_READ_PERMISSION = 'role:read';

const rolesRoutes =
  (deps: RolesHttpDeps, hooks: RolesHttpHooks): FastifyPluginAsyncZodOpenApi =>
  async (scope) => {
    // US1: GET /users/:id/permissions — permissoes efetivas (uniao das roles) de um usuario.
    scope.route({
      method: 'GET',
      url: '/users/:id/permissions',
      preHandler: [hooks.requireAuth, hooks.authorize(ROLE_READ_PERMISSION)],
      schema: {
        params: userPermissionsParamSchema,
        response: { 200: userPermissionsResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.getUserPermissions(req.params.id);
        // Borda -> contrato: o use case devolve `readonly string[]`; o schema 200 exige
        // `{ permissions: [...] }`. Envelopa o ok preservando o err (mapeado p/ 400/404).
        const shaped = result.ok ? ok({ permissions: [...result.value] }) : result;
        return sendResult(reply, shaped, {
          ok: 200,
          errors: { 'user-id-invalid': 400, 'user-not-found': 404 },
        });
      },
    });
  };

export const rolesHttpPlugin =
  (deps: RolesHttpDeps, hooks: RolesHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app.withTypeProvider<FastifyZodOpenApiTypeProvider>().register(rolesRoutes(deps, hooks));
  };
