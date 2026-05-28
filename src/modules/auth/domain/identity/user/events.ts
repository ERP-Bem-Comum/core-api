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

export type UserEvent = UserRegistered | PasswordChanged | RoleAssigned | UserDisabled;
