// Mapper Role: row MySQL <-> agregado Role (modulo auth).
//
// Blueprint DBA (AUTH-DB-REPO-ROLE/001-query-blueprint.md):
//   - roleFromRows(roleRow, permRows): Result<Role, RoleMapperError>
//     Role.create + Permission.parse; description ignorado (sem campo no dominio).
//     RoleId.rehydrate na borda.
//   - roleToInsert(role, now): NewRoleRow
//     description: null (sem campo no dominio — Decisao 3 do 000-request).
//
// ADR-0020: sem JSON, dialeto MySQL unico. ADR-0014: so auth_*.

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import * as RoleId from '../../../domain/authorization/role-id.ts';
import * as Permission from '../../../domain/authorization/permission.ts';
import * as Role from '../../../domain/authorization/role.ts';
import type { RoleRow, NewRoleRow, PermissionRow } from '../schemas/mysql.ts';

// ─── Tagged error variants ────────────────────────────────────────────────────

export type RoleMapperInvalidRoleId = Readonly<{
  tag: 'RoleMapperInvalidRoleId';
  attemptedValue: string;
}>;

export type RoleMapperInvalidPermission = Readonly<{
  tag: 'RoleMapperInvalidPermission';
  name: string;
  reason: string;
}>;

export type RoleMapperInvalidRole = Readonly<{
  tag: 'RoleMapperInvalidRole';
  roleId: string;
  reason: string;
}>;

// ─── Union ────────────────────────────────────────────────────────────────────

export type RoleMapperError =
  | RoleMapperInvalidRoleId
  | RoleMapperInvalidPermission
  | RoleMapperInvalidRole;

// ─── Case constructors ────────────────────────────────────────────────────────

const invalidRoleId = (attemptedValue: string): RoleMapperInvalidRoleId => ({
  tag: 'RoleMapperInvalidRoleId',
  attemptedValue,
});

const invalidPermission = (name: string, reason: string): RoleMapperInvalidPermission => ({
  tag: 'RoleMapperInvalidPermission',
  name,
  reason,
});

const invalidRole = (roleId: string, reason: string): RoleMapperInvalidRole => ({
  tag: 'RoleMapperInvalidRole',
  roleId,
  reason,
});

// ─── Tipo de input da query Q2 ────────────────────────────────────────────────
//
// Q2: auth_role_permission JOIN auth_permission WHERE role_id=? (ou IN (...))
// A row inclui role_id (da juncao) e os campos de PermissionRow.
export type PermJoinRow = Readonly<{ roleId: string }> & PermissionRow;

// ─── roleFromRows ──────────────────────────────────────────────────────────────
//
// Blueprint §findById/list: o repo passa:
//   roleRow  -> row de auth_role (Q1)
//   permRows -> rows de auth_role_permission JOIN auth_permission (Q2)
//
// description e ignorado (sem correspondente no dominio — Decisao 3 do 000-request).
// RoleId.rehydrate na borda (branded type).

export const roleFromRows = (
  roleRow: Readonly<RoleRow>,
  permRows: readonly Readonly<PermJoinRow>[],
): Result<Role.Role, RoleMapperError> => {
  // Reidratar id (branded RoleId)
  const idR = RoleId.rehydrate(roleRow.id);
  if (!idR.ok) return err(invalidRoleId(roleRow.id));

  // Construir permissions[] via Permission.parse
  const permissions: Permission.Permission[] = [];
  for (const permRow of permRows) {
    const permR = Permission.parse(permRow.name);
    if (!permR.ok) return err(invalidPermission(permRow.name, permR.error));
    permissions.push(permR.value);
  }

  // Role.create valida name (nao-vazio) e deduplicacao
  const roleR = Role.create({ id: idR.value, name: roleRow.name, permissions });
  if (!roleR.ok) return err(invalidRole(roleRow.id, roleR.error));

  return ok(roleR.value);
};

// ─── roleToInsert ──────────────────────────────────────────────────────────────
//
// Converte o agregado Role para a row de INSERT/UPDATE em auth_role.
// `now` e injetado pelo repo (via Clock.now()) — nao usa `new Date()` aqui.
// description: null (sem campo no dominio — Decisao 3 do 000-request).

export const roleToInsert = (role: Role.Role, now: Date): NewRoleRow => ({
  id: role.id as unknown as string,
  name: role.name,
  description: null,
  createdAt: now,
  updatedAt: now,
});
