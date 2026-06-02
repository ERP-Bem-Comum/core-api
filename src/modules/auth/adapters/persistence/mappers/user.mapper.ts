// Mapper User: row MySQL <-> agregado User (modulo auth).
//
// Blueprint DBA (001-query-blueprint.md):
//   - userFromRows(userRow, roleRows, permRows): Result<User, UserMapperError>
//     Dispatcher por status -> ActiveUser | DisabledUser.
//     Agrupa permissoes por role_id via Map. Role.create + Permission.parse.
//     Email.parse / PasswordHash.fromString / UserId.rehydrate na borda.
//   - userToInsert(user, now): NewUserRow
//     Converte o agregado para row de insert/update.
//
// Tagged errors (Padrao D — payload de evidencia, espelha contract.mapper.ts).
// ADR-0020: sem JSON, dialeto MySQL unico. ADR-0014: so auth_*.

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import * as UserId from '../../../domain/identity/user-id.ts';
import * as Email from '../../../domain/identity/email.ts';
import * as PasswordHash from '../../../domain/credential/password-hash.ts';
import * as RoleId from '../../../domain/authorization/role-id.ts';
import * as Permission from '../../../domain/authorization/permission.ts';
import * as Role from '../../../domain/authorization/role.ts';
import type { User, ActiveUser, DisabledUser } from '../../../domain/identity/user/types.ts';
import type { UserRow, NewUserRow, UserRoleRow, RoleRow, PermissionRow } from '../schemas/mysql.ts';

// ─── Tagged error variants (Padrao D — free functions, DO D§22) ──────────────

export type UserMapperInvalidUserId = Readonly<{
  tag: 'UserMapperInvalidUserId';
  attemptedValue: string;
}>;

export type UserMapperInvalidEmail = Readonly<{
  tag: 'UserMapperInvalidEmail';
  attemptedValue: string;
}>;

export type UserMapperInvalidPasswordHash = Readonly<{
  tag: 'UserMapperInvalidPasswordHash';
  reason: string;
}>;

export type UserMapperInvalidStatus = Readonly<{
  tag: 'UserMapperInvalidStatus';
  attemptedValue: string;
}>;

export type UserMapperInvalidRole = Readonly<{
  tag: 'UserMapperInvalidRole';
  roleId: string;
  reason: string;
}>;

export type UserMapperInvalidPermission = Readonly<{
  tag: 'UserMapperInvalidPermission';
  name: string;
  reason: string;
}>;

export type UserMapperMissingDisabledAt = Readonly<{
  tag: 'UserMapperMissingDisabledAt';
  userId: string;
}>;

// ─── Union ────────────────────────────────────────────────────────────────────

export type UserMapperError =
  | UserMapperInvalidUserId
  | UserMapperInvalidEmail
  | UserMapperInvalidPasswordHash
  | UserMapperInvalidStatus
  | UserMapperInvalidRole
  | UserMapperInvalidPermission
  | UserMapperMissingDisabledAt;

// ─── Case constructors ────────────────────────────────────────────────────────

const invalidUserId = (attemptedValue: string): UserMapperInvalidUserId => ({
  tag: 'UserMapperInvalidUserId',
  attemptedValue,
});

const invalidEmail = (attemptedValue: string): UserMapperInvalidEmail => ({
  tag: 'UserMapperInvalidEmail',
  attemptedValue,
});

const invalidPasswordHash = (reason: string): UserMapperInvalidPasswordHash => ({
  tag: 'UserMapperInvalidPasswordHash',
  reason,
});

const invalidStatus = (attemptedValue: string): UserMapperInvalidStatus => ({
  tag: 'UserMapperInvalidStatus',
  attemptedValue,
});

const invalidRole = (roleId: string, reason: string): UserMapperInvalidRole => ({
  tag: 'UserMapperInvalidRole',
  roleId,
  reason,
});

const invalidPermission = (name: string, reason: string): UserMapperInvalidPermission => ({
  tag: 'UserMapperInvalidPermission',
  name,
  reason,
});

const missingDisabledAt = (userId: string): UserMapperMissingDisabledAt => ({
  tag: 'UserMapperMissingDisabledAt',
  userId,
});

// ─── Tipos de input das queries Q2 e Q3 ──────────────────────────────────────
//
// Q2: auth_user_role JOIN auth_role WHERE user_id=?
// A row de join inclui campos do UserRoleRow (user_id, role_id, assigned_at)
// e do RoleRow (id, name, description, created_at, updated_at).
export type RoleJoinRow = UserRoleRow & RoleRow;

// Q3: auth_role_permission JOIN auth_permission WHERE role_id IN (...)
// A row inclui role_id (da juncao) e os campos de PermissionRow.
export type PermJoinRow = Readonly<{ roleId: string }> & PermissionRow;

// ─── userFromRows ──────────────────────────────────────────────────────────────
//
// Blueprint §5: 3 queries separadas. O repo passa:
//   userRow  -> row de auth_user (Q1)
//   roleRows -> rows de auth_user_role JOIN auth_role (Q2)
//   permRows -> rows de auth_role_permission JOIN auth_permission (Q3)
//
// Agrupa permissoes por role_id (Map), constroi Role via Role.create, depois
// dispatcha por status -> ActiveUser | DisabledUser.

export const userFromRows = (
  userRow: Readonly<UserRow>,
  roleRows: readonly Readonly<RoleJoinRow>[],
  permRows: readonly Readonly<PermJoinRow>[],
): Result<User, UserMapperError> => {
  // Reidratar id (branded UserId)
  const idR = UserId.rehydrate(userRow.id);
  if (!idR.ok) return err(invalidUserId(userRow.id));

  // Reidratar email (branded Email — ja normalizado no DB pelo mapper de escrita)
  const emailR = Email.parse(userRow.email);
  if (!emailR.ok) return err(invalidEmail(userRow.email));

  // Reidratar password hash (nullable — OIDC-ready, DD-USER-OIDC).
  // A coluna password_hash e nullable: usuario federado/OIDC nao tem credencial local.
  // password_hash NULL -> passwordHash: null no agregado (sem placeholder, byte-a-byte).
  // hash nao-null -> PasswordHash.fromString (rejeita vazio: defesa contra DB corrompido).
  let passwordHash: PasswordHash.PasswordHash | null = null;
  if (userRow.passwordHash !== null) {
    const hashR = PasswordHash.fromString(userRow.passwordHash);
    if (!hashR.ok) return err(invalidPasswordHash('password-hash-empty'));
    passwordHash = hashR.value;
  }

  // Agrupar permissoes por role_id (Map<roleId, Permission[]>)
  const permsByRole = new Map<string, string[]>();
  for (const perm of permRows) {
    const existing = permsByRole.get(perm.roleId) ?? [];
    existing.push(perm.name);
    permsByRole.set(perm.roleId, existing);
  }

  // Construir roles[] via Role.create + Permission.parse
  const roles: Role.Role[] = [];
  for (const roleRow of roleRows) {
    const roleIdR = RoleId.rehydrate(roleRow.roleId);
    if (!roleIdR.ok) return err(invalidRole(roleRow.roleId, 'role-id-invalid'));

    const rawPerms = permsByRole.get(roleRow.roleId) ?? [];
    const permissions: Permission.Permission[] = [];
    for (const name of rawPerms) {
      const permR = Permission.parse(name);
      if (!permR.ok) return err(invalidPermission(name, permR.error));
      permissions.push(permR.value);
    }

    const roleR = Role.create({ id: roleIdR.value, name: roleRow.name, permissions });
    if (!roleR.ok) return err(invalidRole(roleRow.roleId, roleR.error));
    roles.push(roleR.value);
  }

  // Dispatcher por status -> ActiveUser | DisabledUser (blueprint §5 + types.ts)
  const status = userRow.status;
  if (status === 'active') {
    const user: ActiveUser = {
      id: idR.value,
      email: emailR.value,
      passwordHash,
      roles,
      status: 'active' as const,
    };
    return ok(user);
  }

  if (status === 'disabled') {
    if (userRow.disabledAt === null) return err(missingDisabledAt(userRow.id));
    const user: DisabledUser = {
      id: idR.value,
      email: emailR.value,
      passwordHash,
      roles,
      status: 'disabled' as const,
      disabledAt: userRow.disabledAt,
    };
    return ok(user);
  }

  // Status desconhecido — corrompido no DB (CHECK auth_user_status_chk e defesa em profundidade)
  return err(invalidStatus(status));
};

// ─── userToInsert ──────────────────────────────────────────────────────────────
//
// Converte o agregado User para a row de INSERT/UPDATE em auth_user.
// `now` e injetado pelo repo (via Clock.now()) — nao usa `new Date()` aqui.
// password_hash: null para usuarios OIDC (PasswordHash opaco, nunca vazio no dominio local).

export const userToInsert = (user: User, now: Date): NewUserRow => {
  // password_hash NULL para user federado/OIDC (passwordHash === null); senao a string opaca.
  // DD-USER-OIDC: mapeia passwordHash null <-> coluna NULL byte-a-byte (sem placeholder).
  const passwordHash: string | null =
    user.passwordHash === null ? null : (user.passwordHash as unknown as string);

  if (user.status === 'active') {
    return {
      id: user.id as unknown as string,
      email: user.email as unknown as string,
      passwordHash,
      status: 'active',
      disabledAt: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  // DisabledUser
  return {
    id: user.id as unknown as string,
    email: user.email as unknown as string,
    passwordHash,
    status: 'disabled',
    disabledAt: user.disabledAt,
    createdAt: now,
    updatedAt: now,
  };
};
