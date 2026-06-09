/**
 * Catálogo de permissions do recurso program (RBAC) — módulo programs.
 *
 * SSoT das permissions `resource:action` expostas pela borda HTTP de Programas.
 * Consumido pelo plugin (`adapters/http/plugin.ts`) e pelo seed RBAC dev/test.
 * Espelha `partners/public-api/permissions.ts`. As strings devem existir no catálogo
 * global (`auth/domain/authorization/permission-catalog.ts`).
 *
 * `deactivate` é permissão própria (desativar/reativar são ação sensível separada da edição).
 */

export const PROGRAM_PERMISSION = {
  read: 'program:read',
  write: 'program:write',
  deactivate: 'program:deactivate',
} as const;

export type ProgramPermission = (typeof PROGRAM_PERMISSION)[keyof typeof PROGRAM_PERMISSION];
