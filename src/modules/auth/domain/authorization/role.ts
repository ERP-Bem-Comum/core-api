/**
 * Role - agregado de RBAC do modulo auth (id, name, permissions[]).
 *
 * Module-as-namespace (Padrao D): `import * as Role from '...role.ts'`.
 *
 * Agregado NAO-brandado (SKILL ts-domain-modeler 3.A.1): identidade vem do `id: RoleId`.
 * Imutavel: transicoes via spread + `immutable()`; arrays via spread/filter, nunca push/splice.
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { RoleId } from './role-id.ts';
import type { Permission } from './permission.ts';

export type Role = Readonly<{
  id: RoleId;
  name: string;
  permissions: readonly Permission[];
}>;

export type RoleError = 'role-name-empty';

export type CreateRoleInput = Readonly<{
  id: RoleId;
  name: string;
  permissions: readonly Permission[];
}>;

const dedupe = (permissions: readonly Permission[]): readonly Permission[] => [
  ...new Set(permissions),
];

export const create = (input: CreateRoleInput): Result<Role, RoleError> => {
  const name = input.name.trim();
  if (name.length === 0) return err('role-name-empty');
  return ok(immutable({ id: input.id, name, permissions: dedupe(input.permissions) }));
};

export const hasPermission = (role: Role, permission: Permission): boolean =>
  role.permissions.includes(permission);

export const grant = (role: Role, permission: Permission): Role =>
  hasPermission(role, permission)
    ? role
    : immutable({ ...role, permissions: [...role.permissions, permission] });

export const revoke = (role: Role, permission: Permission): Role =>
  immutable({ ...role, permissions: role.permissions.filter((p) => p !== permission) });
