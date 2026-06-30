/**
 * RoleName - branded type + smart constructor do modulo auth (nome de papel RBAC).
 *
 * Module-as-namespace (Padrao D): consumir com `import * as RoleName from '...role-name.ts'`.
 *
 * Da identidade/normalizacao ao nome de papel (Role.name e string crua hoje). Unicidade
 * NAO e responsabilidade do VO - e regra de repositorio (auth_role_name_idx).
 *
 * Normaliza trim nas bordas + colapsa espacos internos multiplos em um unico.
 * Comprimento limitado a 64 (alinhado a auth_role.name varchar(64)).
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type RoleName = Brand<string, 'RoleName'>;

export type RoleNameError = 'role-name-invalid';

const MAX_LENGTH = 64;

const normalize = (raw: string): string => raw.trim().replace(/\s+/g, ' ');

export const create = (raw: string): Result<RoleName, RoleNameError> => {
  const normalized = normalize(raw);
  if (normalized.length === 0) return err('role-name-invalid');
  if (normalized.length > MAX_LENGTH) return err('role-name-invalid');
  // Cast unico e auditado (SKILL ts-domain-modeler 3.B.4): borda do sistema de tipos.
  return ok(normalized as RoleName);
};
