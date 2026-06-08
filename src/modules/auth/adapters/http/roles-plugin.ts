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

import * as UserId from '../../domain/identity/user-id.ts';
import * as RoleId from '../../domain/authorization/role-id.ts';
import type { getUserPermissions } from '../../application/use-cases/get-user-permissions.ts';
import type { listPermissionCatalog } from '../../application/use-cases/list-permission-catalog.ts';
import type { listRoles } from '../../application/use-cases/list-roles.ts';
import type { createRole } from '../../application/use-cases/create-role.ts';
import type { updateRole } from '../../application/use-cases/update-role.ts';
import type { archiveRole } from '../../application/use-cases/archive-role.ts';
import type { assignRole } from '../../application/use-cases/assign-role.ts';
import type { revokeRole } from '../../application/use-cases/revoke-role.ts';
import {
  assignRoleBodySchema,
  assignRoleResponseSchema,
  createRoleBodySchema,
  createRoleResponseSchema,
  permissionCatalogResponseSchema,
  revokeRoleResponseSchema,
  roleIdParamSchema,
  roleListItemSchema,
  roleListResponseSchema,
  updateRoleBodySchema,
  updateRoleResponseSchema,
  userPermissionsParamSchema,
  userPermissionsResponseSchema,
  userRoleParamSchema,
} from './roles-schemas.ts';

export type RolesHttpDeps = Readonly<{
  /** Use cases ja instanciados pela composition — nao re-instanciar aqui. */
  getUserPermissions: ReturnType<typeof getUserPermissions>;
  /** Catalogo fixo de permissoes (spec 006 US2) — consumido por GET /api/v1/permissions. */
  listPermissionCatalog: ReturnType<typeof listPermissionCatalog>;
  /** Listagem de papeis com suas permissoes (spec 006 US3) — consumido por GET /api/v1/roles. */
  listRoles: ReturnType<typeof listRoles>;
  /** Criacao de papel (spec 006 US5) — consumido por POST /api/v1/roles. */
  createRole: ReturnType<typeof createRole>;
  /** Edicao de papel (spec 006 US6) — consumido por PUT /api/v1/roles/:id. */
  updateRole: ReturnType<typeof updateRole>;
  /** Desativacao de papel (spec 006 US7) — consumido por PATCH /api/v1/roles/:id/deactivate. */
  archiveRole: ReturnType<typeof archiveRole>;
  /** Atribuicao de papel a usuario (spec 006 US4) — consumido por POST /users/:id/roles. */
  assignRole: ReturnType<typeof assignRole>;
  /** Revogacao de papel de usuario (spec 006 US4) — consumido por DELETE /users/:id/roles/:roleId. */
  revokeRole: ReturnType<typeof revokeRole>;
}>;

export type RolesHttpHooks = Readonly<{
  requireAuth: preHandlerAsyncHookHandler;
  authorize: (permissionName: string) => preHandlerAsyncHookHandler;
}>;

const ROLE_READ_PERMISSION = 'role:read';
const ROLE_CREATE_PERMISSION = 'role:create';
const ROLE_UPDATE_PERMISSION = 'role:update';

// Limite dedicado das rotas de ESCRITA (POST/DELETE), separado do teto global (200/min). O token
// ja e exigido, mas evita abuso autenticado (ex.: atribuicoes em massa). Espelha users-plugin.ts.
const WRITE_RATE_LIMIT = { max: 30, timeWindow: '1 minute' } as const;

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

    // US5: POST /roles — cria um papel novo (nome unico + permissions ⊆ catalogo). Permission
    // role:create (hook authorize, fail-closed). O use case valida nome/permissions/unicidade;
    // a borda mapeia o Result -> 201/409/422/503. Rate-limit de escrita (espelha US4).
    scope.route({
      method: 'POST',
      url: '/roles',
      preHandler: [hooks.requireAuth, hooks.authorize(ROLE_CREATE_PERMISSION)],
      config: { rateLimit: WRITE_RATE_LIMIT },
      schema: {
        body: createRoleBodySchema,
        response: { 201: createRoleResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.createRole(req.body);
        return sendResult(reply, result, {
          ok: 201,
          errors: {
            'role-name-duplicate': 409,
            'role-name-invalid': 422,
            'role-permission-not-in-catalog': 422,
            'role-repo-unavailable': 503,
          },
        });
      },
    });

    // US6: PUT /roles/:id — edita um papel (patch parcial: renomeia e/ou substitui permissions ⊆
    // catalogo). Permission role:update (hook authorize, fail-closed). A propagacao as permissoes
    // efetivas dos usuarios (FR-007) e automatica via juncao auth_user_role. O use case devolve o
    // Role do dominio; a borda mapeia p/ o DTO { id, name, active, permissions } e -> 200/409/422/503.
    scope.route({
      method: 'PUT',
      url: '/roles/:id',
      preHandler: [hooks.requireAuth, hooks.authorize(ROLE_UPDATE_PERMISSION)],
      config: { rateLimit: WRITE_RATE_LIMIT },
      schema: {
        params: roleIdParamSchema,
        body: updateRoleBodySchema,
        response: { 200: updateRoleResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        // exactOptionalPropertyTypes: monta o command incluindo cada chave so quando presente
        // (espalhar req.body alargaria os tipos para `| undefined`, proibido pelo target).
        const result = await deps.updateRole({
          id: req.params.id,
          ...(req.body.name !== undefined ? { name: req.body.name } : {}),
          ...(req.body.permissions !== undefined ? { permissions: req.body.permissions } : {}),
        });
        const shaped = result.ok
          ? ok({
              id: String(result.value.id),
              name: String(result.value.name),
              active: result.value.status === 'active',
              permissions: result.value.permissions.map(String),
            })
          : result;
        return sendResult(reply, shaped, {
          ok: 200,
          errors: {
            'role-id-invalid': 400,
            'role-not-found': 404,
            'role-name-duplicate': 409,
            'role-name-invalid': 422,
            'role-permission-not-in-catalog': 422,
            'role-repo-unavailable': 503,
          },
        });
      },
    });

    // US7: PATCH /roles/:id/deactivate — desativa (arquiva) um papel, tornando-o nao-atribuivel.
    // Permission role:update (hook authorize, fail-closed). Bloqueado se o papel ainda estiver
    // atribuido a usuarios (role-in-use -> 409, FR-012 — a mensagem orienta revogar antes). O use
    // case devolve o Role do dominio (status archived); a borda mapeia p/ o DTO { id, name, active,
    // permissions } (active=false apos arquivar) e -> 200/400/404/409/503.
    scope.route({
      method: 'PATCH',
      url: '/roles/:id/deactivate',
      preHandler: [hooks.requireAuth, hooks.authorize(ROLE_UPDATE_PERMISSION)],
      config: { rateLimit: WRITE_RATE_LIMIT },
      schema: {
        params: roleIdParamSchema,
        response: { 200: roleListItemSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const result = await deps.archiveRole(req.params.id);
        const shaped = result.ok
          ? ok({
              id: String(result.value.id),
              name: String(result.value.name),
              active: result.value.status === 'active',
              permissions: result.value.permissions.map(String),
            })
          : result;
        return sendResult(reply, shaped, {
          ok: 200,
          errors: {
            'role-id-invalid': 400,
            'role-not-found': 404,
            'role-in-use': 409,
            'role-repo-unavailable': 503,
          },
        });
      },
    });

    // US4: POST /users/:id/roles — atribui um papel a um usuario (idempotente). SEM hooks.authorize:
    // o use case autoriza o ator (user:assign-role, DD-USER-07). actorId vem do JWT (req.userId),
    // NUNCA do body. Parse dos IDs para os branded antes de chamar o use case.
    scope.route({
      method: 'POST',
      url: '/users/:id/roles',
      preHandler: [hooks.requireAuth],
      config: { rateLimit: WRITE_RATE_LIMIT },
      schema: {
        params: userPermissionsParamSchema,
        body: assignRoleBodySchema,
        response: { 200: assignRoleResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const actorId = UserId.rehydrate(req.userId);
        if (!actorId.ok) {
          return sendResult(reply, actorId, { errors: { 'user-id-invalid': 400 } });
        }
        const targetUserId = UserId.rehydrate(req.params.id);
        if (!targetUserId.ok) {
          return sendResult(reply, targetUserId, { errors: { 'user-id-invalid': 400 } });
        }
        const roleId = RoleId.rehydrate(req.body.roleId);
        if (!roleId.ok) {
          return sendResult(reply, roleId, { errors: { 'role-id-invalid': 400 } });
        }
        const result = await deps.assignRole({
          actorId: actorId.value,
          targetUserId: targetUserId.value,
          roleId: roleId.value,
        });
        const shaped = result.ok ? ok({ assigned: true }) : result;
        return sendResult(reply, shaped, {
          ok: 200,
          errors: {
            forbidden: 403,
            'user-not-found': 404,
            'role-not-found': 404,
            'user-disabled': 422,
            'user-repo-unavailable': 503,
            'role-repo-unavailable': 503,
          },
        });
      },
    });

    // US4: DELETE /users/:id/roles/:roleId — revoga um papel (idempotente). SEM hooks.authorize:
    // o use case autoriza (user:assign-role) e protege o auto-lockout (cannot-self-lockout -> 422,
    // FR-010). actorId vem do JWT, NUNCA do body.
    scope.route({
      method: 'DELETE',
      url: '/users/:id/roles/:roleId',
      preHandler: [hooks.requireAuth],
      config: { rateLimit: WRITE_RATE_LIMIT },
      schema: {
        params: userRoleParamSchema,
        response: { 200: revokeRoleResponseSchema },
      } satisfies FastifyZodOpenApiSchema,
      handler: async (req, reply) => {
        const actorId = UserId.rehydrate(req.userId);
        if (!actorId.ok) {
          return sendResult(reply, actorId, { errors: { 'user-id-invalid': 400 } });
        }
        const targetUserId = UserId.rehydrate(req.params.id);
        if (!targetUserId.ok) {
          return sendResult(reply, targetUserId, { errors: { 'user-id-invalid': 400 } });
        }
        const roleId = RoleId.rehydrate(req.params.roleId);
        if (!roleId.ok) {
          return sendResult(reply, roleId, { errors: { 'role-id-invalid': 400 } });
        }
        const result = await deps.revokeRole({
          actorId: actorId.value,
          targetUserId: targetUserId.value,
          roleId: roleId.value,
        });
        const shaped = result.ok ? ok({ revoked: true }) : result;
        return sendResult(reply, shaped, {
          ok: 200,
          errors: {
            forbidden: 403,
            'user-not-found': 404,
            'user-disabled': 422,
            'cannot-self-lockout': 422,
            'user-repo-unavailable': 503,
            'role-repo-unavailable': 503,
          },
        });
      },
    });
  };

export const rolesHttpPlugin =
  (deps: RolesHttpDeps, hooks: RolesHttpHooks): FastifyPluginAsync =>
  async (app) => {
    await app.withTypeProvider<FastifyZodOpenApiTypeProvider>().register(rolesRoutes(deps, hooks));
  };
