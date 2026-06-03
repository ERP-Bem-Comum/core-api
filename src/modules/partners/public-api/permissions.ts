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
