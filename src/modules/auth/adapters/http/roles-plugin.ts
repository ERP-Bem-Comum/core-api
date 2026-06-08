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
import type { listPermissionCatalog } from '../../application/use-cases/list-permission-catalog.ts';
import type { listRoles } from '../../application/use-cases/list-roles.ts';
import {
  permissionCatalogResponseSchema,
  roleListResponseSchema,
  userPermissionsParamSchema,
  userPermissionsResponseSchema,
} from './roles-schemas.ts';

export type RolesHttpDeps = Readonly<{
  /** Use cases ja instanciados pela composition — nao re-instanciar aqui. */
  getUserPermissions: ReturnType<typeof getUserPermissions>;
  /** Catalogo fixo de permissoes (spec 006 US2) — consumido por GET /api/v1/permissions. */
  listPermissionCatalog: ReturnType<typeof listPermissionCatalog>;
  /** Listagem de papeis com suas permissoes (spec 006 US3) — consumido por GET /api/v1/roles. */
  listRoles: ReturnType<typeof listRoles>;
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

    // US2: GET /permissions — catalogo fixo de permissoes (read-only, FR-011). Sem rotas de
    // escrita: o catalogo e imutavel em runtime (POST/PUT/DELETE retornam 404 por inexistencia).
    scope.route({
      method: 'GET',
      url: '/permissions',
      preHandler: [hooks.requireAuth, hooks.authorize(ROLE_READ_PERMISSION)],
      schema: {
        response: { 200: permissionCatalogResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listPermissionCatalog();
        // Borda -> contrato: o use case devolve `readonly Item[]`; o schema 200 exige
        // `{ items: [...] }`. Envelopa o ok (o use case nunca falha — sem mapa de erros).
        const shaped = result.ok ? ok({ items: [...result.value] }) : result;
        return sendResult(reply, shaped, { ok: 200 });
      },
    });

    // US3: GET /roles — todos os papeis com suas permissoes. O use case devolve o agregado
    // de dominio cru (Role[]); a borda mapeia p/ o DTO { id, name, active, permissions }
    // (`active` = status === 'active'). Permission role:read.
    scope.route({
      method: 'GET',
      url: '/roles',
      preHandler: [hooks.requireAuth, hooks.authorize(ROLE_READ_PERMISSION)],
      schema: {
        response: { 200: roleListResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (_req, reply) => {
        const result = await deps.listRoles();
        const shaped = result.ok
          ? ok({
              items: result.value.map((role) => ({
                id: String(role.id),
                name: String(role.name),
                active: role.status === 'active',
                permissions: role.permissions.map(String),
              })),
            })
          : result;
        return sendResult(reply, shaped, {
          ok: 200,
          errors: { 'role-repo-unavailable': 503 },
        });
      },
    });
  };

export const rolesHttpPlugin =
  (deps: RolesHttpDeps, hooks: RolesHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app.withTypeProvider<FastifyZodOpenApiTypeProvider>().register(rolesRoutes(deps, hooks));
  };
