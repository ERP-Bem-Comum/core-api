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
import type { Cpf } from '../cpf.ts';
import type { Telephone } from '../telephone.ts';
import type { ProfilePhotoRef } from '../profile-photo-ref.ts';
import type { ActiveUser, DisabledUser, User } from './types.ts';
import type { UserError } from './errors.ts';
import type {
  UserRegistered,
  UserCreated,
  PasswordChanged,
  RoleAssigned,
  UserDisabled,
  UserEnabled,
  UserProfileUpdated,
} from './events.ts';

// Reexporta os tipos do agregado para consumo via namespace (`import * as User`).
export type { ActiveUser, DisabledUser, User, UserProfile } from './types.ts';
export type { UserError } from './errors.ts';
export type {
  UserRegistered,
  UserCreated,
  PasswordChanged,
  RoleAssigned,
  UserDisabled,
  UserEnabled,
  UserProfileUpdated,
  UserEvent,
} from './events.ts';

export type RegisterInput = Readonly<{
  id: UserId;
  email: Email;
  passwordHash: PasswordHash;
  roles: readonly Role[];
}>;

// Criacao administrativa (spec 005, US3): perfil completo + hash placeholder (sem senha real).
// O `unusablePasswordHash` (gerado no composition root, argon2 de bytes aleatorios descartados)
// NUNCA autentica. roles=[] (concessao e operacao separada). status='active' (FR-005).
export type CreateByAdminInput = Readonly<{
  id: UserId;
  email: Email;
  unusablePasswordHash: PasswordHash;
  name: string;
  cpf: Cpf;
  telephone: Telephone;
  photo?: ProfilePhotoRef | null;
  createdByAdminId: UserId;
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
    // Perfil vazio na criacao base (self-register/OIDC). create-user-by-admin preenche depois.
    name: null,
    cpf: null,
    telephone: null,
    photo: null,
    collaboratorId: null,
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

// Criacao administrativa (spec 005, US3): ActiveUser com perfil completo e hash PLACEHOLDER.
// O `unusablePasswordHash` nunca autentica (ver create-user-by-admin / security design).
export const create = (
  input: CreateByAdminInput,
  at: Date,
): Readonly<{ user: ActiveUser; event: UserCreated }> => {
  const user: ActiveUser = immutable({
    id: input.id,
    email: input.email,
    passwordHash: input.unusablePasswordHash,
    roles: [],
    name: input.name,
    cpf: input.cpf,
    telephone: input.telephone,
    photo: input.photo ?? null,
    collaboratorId: null,
    status: 'active' as const,
  });
  const event: UserCreated = immutable({
    type: 'UserCreated' as const,
    userId: input.id,
    email: input.email,
    createdByAdminId: input.createdByAdminId,
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

// ─── Perfil administrativo (spec 005) ──────────────────────────────────────────

// Patch parcial de perfil: campo `undefined` mantem o valor atual; presente (inclusive
// null em collaboratorId) sobrescreve. name/cpf/telephone ja chegam como VO/string validados.
export type UpdateProfileInput = Readonly<{
  name?: string;
  cpf?: Cpf;
  telephone?: Telephone;
  collaboratorId?: string | null;
}>;

const profileEvent = (userId: UserId, at: Date): UserProfileUpdated =>
  immutable({ type: 'UserProfileUpdated' as const, userId, occurredAt: at });

// Aceita User (active ou disabled): admin pode editar o perfil de um usuario inativo.
// Patch parcial: so as chaves presentes (!== undefined) sobrescrevem; null em collaboratorId
// limpa o vinculo. Preserva o estado (status/disabledAt) via narrowing por discriminante.
export const updateProfile = (
  user: User,
  patch: UpdateProfileInput,
  at: Date,
): Readonly<{ user: User; event: UserProfileUpdated }> => {
  const fields = {
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.cpf !== undefined ? { cpf: patch.cpf } : {}),
    ...(patch.telephone !== undefined ? { telephone: patch.telephone } : {}),
    ...(patch.collaboratorId !== undefined ? { collaboratorId: patch.collaboratorId } : {}),
  };
  const next: User =
    user.status === 'active'
      ? immutable({ ...user, ...fields })
      : immutable({ ...user, ...fields });
  return { user: next, event: profileEvent(user.id, at) };
};

export const setPhoto = (
  user: User,
  photo: ProfilePhotoRef | null,
  at: Date,
): Readonly<{ user: User; event: UserProfileUpdated }> => {
  const next: User =
    user.status === 'active' ? immutable({ ...user, photo }) : immutable({ ...user, photo });
  return { user: next, event: profileEvent(user.id, at) };
};

// Reativacao: DisabledUser -> ActiveUser (par do `disable`). Idempotente no use case.
export const enable = (
  user: DisabledUser,
  at: Date,
): Readonly<{ user: ActiveUser; event: UserEnabled }> => {
  const next: ActiveUser = immutable({
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    roles: user.roles,
    name: user.name,
    cpf: user.cpf,
    telephone: user.telephone,
    photo: user.photo,
    collaboratorId: user.collaboratorId,
    status: 'active' as const,
  });
  const event: UserEnabled = immutable({
    type: 'UserEnabled' as const,
    userId: user.id,
    occurredAt: at,
  });
  return { user: next, event };
};
