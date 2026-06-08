/**
 * Schemas Zod das rotas de Gestao de Acessos (spec 006 — ADR-0027).
 *
 * US1: GET /api/v1/users/:id/permissions — permissoes efetivas (uniao) de um usuario.
 * Schemas das US2-US7 (permissions/roles) chegam nos proximos tickets. Zod fica so na borda;
 * o dominio valida via smart constructors.
 */

import * as z from 'zod/v4';

/** Param do GET /api/v1/users/:id/permissions. */
export const userPermissionsParamSchema = z.object({ id: z.string().min(1) });

/** Response 200 do GET /api/v1/users/:id/permissions. */
export const userPermissionsResponseSchema = z.object({
  permissions: z.array(z.string()),
});

export type UserPermissionsResponse = z.infer<typeof userPermissionsResponseSchema>;

/** Item do catalogo fixo de permissoes (US2): resource:action decomposto. */
export const permissionCatalogItemSchema = z.object({
  id: z.string(),
  resource: z.string(),
  action: z.string(),
});

/** Response 200 do GET /api/v1/permissions (catalogo completo, sem duplicatas). */
export const permissionCatalogResponseSchema = z.object({
  items: z.array(permissionCatalogItemSchema),
});

export type PermissionCatalogResponse = z.infer<typeof permissionCatalogResponseSchema>;

/** Item da listagem de papeis (US3): `active` = (status === 'active'); permissions como strings. */
export const roleListItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  active: z.boolean(),
  permissions: z.array(z.string()),
});

/** Response 200 do GET /api/v1/roles (todos os papeis com suas permissoes). */
export const roleListResponseSchema = z.object({
  items: z.array(roleListItemSchema),
});

export type RoleListResponse = z.infer<typeof roleListResponseSchema>;

/** Body do POST /api/v1/users/:id/roles (US4): papel a atribuir. */
export const assignRoleBodySchema = z.object({ roleId: z.string().min(1) });

/** Param do DELETE /api/v1/users/:id/roles/:roleId (US4): usuario + papel. */
export const userRoleParamSchema = z.object({
  id: z.string().min(1),
  roleId: z.string().min(1),
});

/** Body do POST /api/v1/roles (US5): nome + conjunto de permissions (resource:action). */
export const createRoleBodySchema = z.object({
  name: z.string().min(1),
  permissions: z.array(z.string()),
});

/** Response 201 do POST /api/v1/roles (US5): id do papel criado. */
export const createRoleResponseSchema = z.object({ id: z.string() });

/** Response 200 do POST /api/v1/users/:id/roles (US4) — idempotente. */
export const assignRoleResponseSchema = z.object({ assigned: z.boolean() });

/** Response 200 do DELETE /api/v1/users/:id/roles/:roleId (US4) — idempotente. */
export const revokeRoleResponseSchema = z.object({ revoked: z.boolean() });
