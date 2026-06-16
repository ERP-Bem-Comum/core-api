/**
 * Catalogo fixo de permissoes do sistema (RBAC do modulo auth).
 *
 * Module-as-namespace (Padrao D): consumir com `import * as PermissionCatalog from '...'`.
 *
 * FONTE UNICA de verdade das permissions resource:action conhecidas (FR-011 - catalogo
 * deploy-time, imutavel em runtime). Consumido por:
 *   - listPermissionsCatalog (US2 - catalogo completo);
 *   - Role.setPermissions (US5/US6 - valida cada permission ⊆ catalogo);
 *   - seed de auth_permission (T010).
 *
 * Coordenado com a 005 (permissions user:*) - catalogo unico (destrava T048 da 005).
 * ASCII puro (precaucao Node 24 strip-types).
 */

import * as Permission from './permission.ts';

// Strings canonicas auditadas. Espelham as permissions ja usadas em src/ + as role:*
// novas desta spec (gestao de acessos). Manter ordenado por resource para leitura.
const CATALOG_RAW = [
  // act:* (modulo partners - atos)
  'act:read',
  'act:write',
  // collaborator:* (modulo partners - colaboradores)
  'collaborator:read',
  'collaborator:write',
  // contract:* (modulo contracts)
  'contract:delete',
  'contract:mass-approve',
  'contract:read',
  'contract:write',
  // etl:* (ingestao partners)
  'etl:mass-approver',
  // fiscal-document:* (modulo financial - fato gerador)
  'fiscal-document:cancel',
  'fiscal-document:read',
  'fiscal-document:write',
  // financier:* (modulo partners - financiadores)
  'financier:read',
  'financier:write',
  // geography:* (modulo partners - territorio)
  'geography:read',
  'geography:write',
  // payable:* (modulo financial - titulos gerados)
  // payable:read e payable:undo-approval removidas (FR-010/ADR-0004 010 - permissoes inertes: sem rota enforca).
  'payable:approve',
  // program:* (modulo programs - gestao de programas)
  'program:deactivate',
  'program:read',
  'program:write',
  // role:* (gestao de acessos - spec 006, novas)
  'role:assign',
  'role:create',
  'role:read',
  'role:revoke',
  'role:update',
  // supplier:* (modulo partners - fornecedores)
  'supplier:read',
  'supplier:write',
  // user:* (gestao de usuarios - spec 005)
  'user:activate',
  'user:assign-role',
  'user:create',
  'user:deactivate',
  'user:list',
  'user:read',
  'user:register',
  'user:update',
] as const;

// Dominio e puro: sem throw (rule domain.md). Entradas invalidas (typo) sao filtradas;
// a integridade do catalogo e garantida pela suite RED (CA1 valida cada item; CA5 exige
// as ancoras role:*/user:*/contract:mass-approve presentes) - um typo numa ancora reprova
// o gate em vez de explodir em runtime.
const build = (raws: readonly string[]): readonly Permission.Permission[] =>
  raws.flatMap((raw) => {
    const parsed = Permission.parse(raw);
    return parsed.ok ? [parsed.value] : [];
  });

/** Conjunto canonico de permissions do sistema, sem duplicatas. */
export const all: readonly Permission.Permission[] = [...new Set(build(CATALOG_RAW))];

const ALL_SET: ReadonlySet<Permission.Permission> = new Set(all);

/** Pertencimento ao catalogo (validacao de Role.setPermissions ⊆ catalogo). */
export const isInCatalog = (permission: Permission.Permission): boolean => ALL_SET.has(permission);
