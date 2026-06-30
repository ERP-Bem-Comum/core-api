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
  // Alçada de aprovação do papel em centavos; null = sem alçada (FIN-APPROVER-LIMIT-AUTH #289).
  approvalLimitCents: z.number().int().nullable().meta({
    description: 'Alçada de aprovação do papel em centavos; null = sem alçada.',
  }),
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
  // Alçada de aprovação (centavos, 0 <= valor <= MAX_SAFE_INTEGER — teto alinhado ao VO Money,
  // src/shared/kernel/money.ts). Ausente/null = papel sem alçada (#289).
  approvalLimitCents: z
    .number()
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .nullable()
    .optional()
    .meta({
      description:
        'Alçada de aprovação do papel em centavos (0 a MAX_SAFE_INTEGER, alinhado ao VO Money). Ausente ou null = papel sem alçada (não aprova).',
    }),
});

/** Response 201 do POST /api/v1/roles (US5): id do papel criado. */
export const createRoleResponseSchema = z.object({ id: z.string() });

/** Param do PUT /api/v1/roles/:id (US6): id do papel a editar. */
export const roleIdParamSchema = z.object({ id: z.string().min(1) });

/**
 * Body do PUT /api/v1/roles/:id (US6): patch parcial. `name` renomeia; `permissions` substitui o
 * conjunto inteiro. Ambos opcionais (ao menos um esperado; ausencia de ambos e no-op valido).
 */
export const updateRoleBodySchema = z.object({
  name: z.string().min(1).optional(),
  permissions: z.array(z.string()).optional(),
  // Alçada de aprovação (centavos, 0 <= valor <= MAX_SAFE_INTEGER — teto alinhado ao VO Money,
  // src/shared/kernel/money.ts). Presente (incl. null) atualiza/zera; ausente = no-op (#289).
  approvalLimitCents: z
    .number()
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .nullable()
    .optional()
    .meta({
      description:
        'Alçada de aprovação em centavos (0 a MAX_SAFE_INTEGER). Presente (incl. null) atualiza/zera; ausente = no-op.',
    }),
});

/** Response 200 do PUT /api/v1/roles/:id (US6): o papel atualizado (mesmo DTO da listagem). */
export const updateRoleResponseSchema = roleListItemSchema;

/** Response 200 do POST /api/v1/users/:id/roles (US4) — idempotente. */
export const assignRoleResponseSchema = z.object({ assigned: z.boolean() });

/** Response 200 do DELETE /api/v1/users/:id/roles/:roleId (US4) — idempotente. */
export const revokeRoleResponseSchema = z.object({ revoked: z.boolean() });
