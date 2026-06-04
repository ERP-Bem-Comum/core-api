/**
 * Catálogo de permissions do recurso collaborator (RBAC) — módulo partners.
 *
 * SSoT das permissions `resource:action` expostas pela borda HTTP de Colaboradores.
 * Substitui magic strings inline (`authorize('collaborator:read')`) por acesso nomeado
 * type-safe. Consumido pelo plugin (`adapters/http/plugin.ts`) e pelo seed RBAC dev/test.
 * Espelha `contracts/public-api/permissions.ts`.
 */

export const COLLABORATOR_PERMISSION = {
  read: 'collaborator:read',
  write: 'collaborator:write',
} as const;

export type CollaboratorPermission =
  (typeof COLLABORATOR_PERMISSION)[keyof typeof COLLABORATOR_PERMISSION];

export const SUPPLIER_PERMISSION = {
  read: 'supplier:read',
  write: 'supplier:write',
} as const;

export type SupplierPermission = (typeof SUPPLIER_PERMISSION)[keyof typeof SUPPLIER_PERMISSION];

export const FINANCIER_PERMISSION = {
  read: 'financier:read',
  write: 'financier:write',
} as const;

export type FinancierPermission = (typeof FINANCIER_PERMISSION)[keyof typeof FINANCIER_PERMISSION];
