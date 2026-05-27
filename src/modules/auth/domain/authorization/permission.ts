/**
 * Permission - branded type + smart constructor do modulo auth (RBAC granular).
 *
 * Module-as-namespace (Padrao D): consumir com `import * as Permission from '...permission.ts'`.
 *
 * Formato canonico `resource:action`: exatamente dois segmentos kebab alfanumericos
 * (`[a-z0-9]` com hifens internos) separados por um unico ':'. Ex.: 'contract:delete',
 * 'contract:mass-approve', 'user:register'.
 *
 * Normaliza trim + toLowerCase (permissoes sao case-insensitive por convencao).
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

export type Permission = Brand<string, 'Permission'>;

export type PermissionError = 'permission-empty' | 'permission-invalid-format';

const SEGMENT = '[a-z0-9]+(?:-[a-z0-9]+)*';
const PERMISSION_REGEX = new RegExp(`^${SEGMENT}:${SEGMENT}$`);

export const parse = (raw: string): Result<Permission, PermissionError> => {
  const normalized = raw.trim().toLowerCase();
  if (normalized.length === 0) return err('permission-empty');
  if (!PERMISSION_REGEX.test(normalized)) return err('permission-invalid-format');
  // Cast unico e auditado (SKILL ts-domain-modeler 3.B.4): borda do sistema de tipos.
  return ok(normalized as Permission);
};
