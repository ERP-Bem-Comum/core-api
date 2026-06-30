/**
 * Role - agregado de RBAC do modulo auth (id, name, permissions[], status).
 *
 * Module-as-namespace (Padrao D): `import * as Role from '...role.ts'`.
 *
 * Agregado NAO-brandado (SKILL ts-domain-modeler 3.A.1): identidade vem do `id: RoleId`.
 * Imutavel: transicoes via spread + `immutable()`; arrays via spread/filter, nunca push/splice.
 * Nome e RoleName (VO); status governa o ciclo de vida (active/archived, FR-012).
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { RoleId } from './role-id.ts';
import type { Permission } from './permission.ts';
import * as RoleName from './role-name.ts';
import * as PermissionCatalog from './permission-catalog.ts';
import * as Money from '../../../../shared/kernel/money.ts';

export type RoleStatus = 'active' | 'archived';

export type Role = Readonly<{
  id: RoleId;
  name: RoleName.RoleName;
  permissions: readonly Permission[];
  status: RoleStatus;
  // Alcada de aprovacao (limite monetario do papel). null = papel sem alcada (nao aprova). FIN-APPROVER-LIMIT-AUTH (#289).
  approvalLimit: Money.Money | null;
}>;

export type RoleError =
  | 'role-name-invalid'
  | 'role-permission-not-in-catalog'
  | 'role-in-use'
  | 'role-approval-limit-invalid';

export type CreateRoleInput = Readonly<{
  id: RoleId;
  name: string;
  permissions: readonly Permission[];
  approvalLimitCents?: number | null;
}>;

export type RehydrateRoleInput = Readonly<{
  id: RoleId;
  name: string;
  permissions: readonly Permission[];
  status: RoleStatus;
  approvalLimitCents?: number | null;
}>;

const dedupe = (permissions: readonly Permission[]): readonly Permission[] => [
  ...new Set(permissions),
];

const outOfCatalog = (permissions: readonly Permission[]): boolean =>
  permissions.some((p) => !PermissionCatalog.isInCatalog(p));

// Resolve o limite de alcada: undefined/null => sem alcada; senao Money (>=0 inteiro).
const resolveApprovalLimit = (
  cents: number | null | undefined,
): Result<Money.Money | null, RoleError> => {
  if (cents === null || cents === undefined) return ok(null);
  const m = Money.fromCents(cents);
  if (!m.ok) return err('role-approval-limit-invalid');
  return ok(m.value);
};

/**
 * Cria um papel novo (nasce `active`). Valida o nome via RoleName; o conjunto de
 * permissoes NAO e validado contra o catalogo aqui (responsabilidade de setPermissions
 * e do use case create-role) para nao quebrar reidratacao/seed de baixo nivel.
 */
export const create = (input: CreateRoleInput): Result<Role, RoleError> => {
  const nameR = RoleName.create(input.name);
  if (!nameR.ok) return err('role-name-invalid');
  const limitR = resolveApprovalLimit(input.approvalLimitCents);
  if (!limitR.ok) return err(limitR.error);
  return ok(
    immutable({
      id: input.id,
      name: nameR.value,
      permissions: dedupe(input.permissions),
      status: 'active',
      approvalLimit: limitR.value,
    }),
  );
};

/**
 * Reconstroi um papel a partir do estado persistido (status + permissoes ja gravadas).
 * O banco e a fonte da verdade: NAO revalida o catalogo (permissoes legadas sobrevivem).
 */
export const rehydrate = (input: RehydrateRoleInput): Result<Role, RoleError> => {
  const nameR = RoleName.create(input.name);
  if (!nameR.ok) return err('role-name-invalid');
  const limitR = resolveApprovalLimit(input.approvalLimitCents);
  if (!limitR.ok) return err(limitR.error);
  return ok(
    immutable({
      id: input.id,
      name: nameR.value,
      permissions: dedupe(input.permissions),
      status: input.status,
      approvalLimit: limitR.value,
    }),
  );
};

/** Define (ou zera, com null) a alcada de aprovacao do papel. cents < 0 => erro. */
export const setApprovalLimit = (role: Role, cents: number | null): Result<Role, RoleError> => {
  const limitR = resolveApprovalLimit(cents);
  if (!limitR.ok) return err(limitR.error);
  return ok(immutable({ ...role, approvalLimit: limitR.value }));
};

export const rename = (role: Role, rawName: string): Result<Role, RoleError> => {
  const nameR = RoleName.create(rawName);
  if (!nameR.ok) return err('role-name-invalid');
  return ok(immutable({ ...role, name: nameR.value }));
};

/** Substitui o conjunto de permissoes; rejeita qualquer permissao fora do catalogo. */
export const setPermissions = (
  role: Role,
  permissions: readonly Permission[],
): Result<Role, RoleError> => {
  if (outOfCatalog(permissions)) return err('role-permission-not-in-catalog');
  return ok(immutable({ ...role, permissions: dedupe(permissions) }));
};

/** Desativa o papel; bloqueado se ainda atribuido a usuarios (FR-012). Idempotente. */
export const archive = (role: Role, isInUse: boolean): Result<Role, RoleError> => {
  if (isInUse) return err('role-in-use');
  return ok(immutable({ ...role, status: 'archived' }));
};

export const hasPermission = (role: Role, permission: Permission): boolean =>
  role.permissions.includes(permission);

export const grant = (role: Role, permission: Permission): Role =>
  hasPermission(role, permission)
    ? role
    : immutable({ ...role, permissions: [...role.permissions, permission] });

export const revoke = (role: Role, permission: Permission): Role =>
  immutable({ ...role, permissions: role.permissions.filter((p) => p !== permission) });
