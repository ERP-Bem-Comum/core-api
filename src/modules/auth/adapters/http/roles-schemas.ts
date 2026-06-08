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
