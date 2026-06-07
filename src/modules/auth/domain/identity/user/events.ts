/**
 * Eventos de dominio do agregado User (modulo auth).
 *
 * DD-USER-05: um evento por transicao, shape flat, PascalCase passado, `occurredAt` injetado.
 * Payload carrega SO metadados (userId, roleId, email, occurredAt) - NUNCA hash/senha/token.
 * ASCII puro.
 */

import type { UserId } from '../user-id.ts';
import type { Email } from '../email.ts';
import type { RoleId } from '../../authorization/role-id.ts';

export type UserRegistered = Readonly<{
  type: 'UserRegistered';
  userId: UserId;
  email: Email;
  occurredAt: Date;
}>;

export type PasswordChanged = Readonly<{
  type: 'PasswordChanged';
  userId: UserId;
  occurredAt: Date;
}>;

export type RoleAssigned = Readonly<{
  type: 'RoleAssigned';
  userId: UserId;
  roleId: RoleId;
  occurredAt: Date;
}>;

export type UserDisabled = Readonly<{
  type: 'UserDisabled';
  userId: UserId;
  occurredAt: Date;
}>;

// Reativacao (par do UserDisabled). Spec 005 US5. Payload so metadados.
export type UserEnabled = Readonly<{
  type: 'UserEnabled';
  userId: UserId;
  occurredAt: Date;
}>;

// Edicao de perfil administrativo (spec 005). Payload so metadados - NUNCA os valores
// editados (name/cpf/telephone sao dados pessoais; o evento carrega apenas userId).
export type UserProfileUpdated = Readonly<{
  type: 'UserProfileUpdated';
  userId: UserId;
  occurredAt: Date;
}>;

export type UserEvent =
  | UserRegistered
  | PasswordChanged
  | RoleAssigned
  | UserDisabled
  | UserEnabled
  | UserProfileUpdated;
