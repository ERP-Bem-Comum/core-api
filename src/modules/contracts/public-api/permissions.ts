/**
 * Catálogo de permissions do módulo contracts (RBAC).
 *
 * SSoT única das permissions `resource:action` deste módulo. Substitui as magic strings
 * inline (`authorize('contract:read')`) por acesso nomeado type-safe — typo vira erro de
 * `tsc` + autocomplete nos call-sites. Outros módulos/scripts (ex.: ETL) importam APENAS
 * via `public-api` (ADR-0006).
 *
 * O branded `Permission` (auth/domain/authorization/permission.ts) continua sendo a borda
 * de entrada externa (`parse(string)`); este catálogo é o conjunto interno conhecido.
 */

export const CONTRACT_PERMISSION = {
  read: 'contract:read',
  write: 'contract:write',
  massApprove: 'contract:mass-approve',
} as const;

export type ContractPermission = (typeof CONTRACT_PERMISSION)[keyof typeof CONTRACT_PERMISSION];
