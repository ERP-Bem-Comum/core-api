/**
 * Agregado User (modulo auth) - transicoes puras.
 *
 * Module-as-namespace (Padrao D). Decisoes: handbook/domain/auth/design-decisions.md (DD-USER-01..05).
 * Transicoes sensiveis aceitam `ActiveUser` (fail-closed por tipo); retornam `{ user, event }`.
 * `at: Date` injetado (Clock no use case, nunca `new Date()` aqui). Senha nunca em claro no dominio.
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import { immutable } from '../../../../../shared/primitives/immutable.ts';
import type { UserId } from '../user-id.ts';
import type { Email } from '../email.ts';
import type { PasswordHash } from '../../credential/password-hash.ts';
import type { Role } from '../../authorization/role.ts';
import type { ActiveUser, DisabledUser, User } from './types.ts';
import type { UserError } from './errors.ts';
import type { UserRegistered, PasswordChanged, RoleAssigned, UserDisabled } from './events.ts';

// Reexporta os tipos do agregado para consumo via namespace (`import * as User`).
export type { ActiveUser, DisabledUser, User } from './types.ts';
export type { UserError } from './errors.ts';
export type {
  UserRegistered,
  PasswordChanged,
  RoleAssigned,
  UserDisabled,
  UserEvent,
} from './events.ts';

export type RegisterInput = Readonly<{
  id: UserId;
  email: Email;
  passwordHash: PasswordHash;
  roles: readonly Role[];
}>;

const dedupeRoles = (roles: readonly Role[]): readonly Role[] => [
  ...new Map(roles.map((r) => [r.id, r])).values(),
];

export const register = (
  input: RegisterInput,
  at: Date,
): Readonly<{ user: ActiveUser; event: UserRegistered }> => {
  const user: ActiveUser = immutable({
    id: input.id,
    email: input.email,
    passwordHash: input.passwordHash,
    roles: dedupeRoles(input.roles),
    status: 'active' as const,
  });
  const event: UserRegistered = immutable({
    type: 'UserRegistered' as const,
    userId: input.id,
    email: input.email,
    occurredAt: at,
  });
  return { user, event };
};

export const parseActive = (user: User): Result<ActiveUser, UserError> =>
  user.status === 'active' ? ok(user) : err('user-disabled');

export const disable = (
  user: ActiveUser,
  at: Date,
): Readonly<{ user: DisabledUser; event: UserDisabled }> => {
  const next: DisabledUser = immutable({ ...user, status: 'disabled' as const, disabledAt: at });
  const event: UserDisabled = immutable({
    type: 'UserDisabled' as const,
    userId: user.id,
    occurredAt: at,
  });
  return { user: next, event };
};

export const changePassword = (
  user: ActiveUser,
  newHash: PasswordHash,
  at: Date,
): Readonly<{ user: ActiveUser; event: PasswordChanged }> => {
  const next: ActiveUser = immutable({ ...user, passwordHash: newHash });
  const event: PasswordChanged = immutable({
    type: 'PasswordChanged' as const,
    userId: user.id,
    occurredAt: at,
  });
  return { user: next, event };
};

export const assignRole = (
  user: ActiveUser,
  role: Role,
  at: Date,
): Readonly<{ user: ActiveUser; event: RoleAssigned }> => {
  const roles: readonly Role[] = user.roles.some((r) => r.id === role.id)
    ? user.roles
    : [...user.roles, role];
  const next: ActiveUser = immutable({ ...user, roles });
  const event: RoleAssigned = immutable({
    type: 'RoleAssigned' as const,
    userId: user.id,
    roleId: role.id,
    occurredAt: at,
  });
  return { user: next, event };
};
