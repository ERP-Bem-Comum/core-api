/**
 * Tipos do agregado User (modulo auth).
 *
 * status como uniao refinada (DD-USER-01): ActiveUser | DisabledUser. `disabledAt`
 * obrigatorio no estado desabilitado (estados eliminam null). Agregado NAO-brandado (3.A.1).
 * ASCII puro.
 */

import type { UserId } from '../user-id.ts';
import type { Email } from '../email.ts';
import type { PasswordHash } from '../../credential/password-hash.ts';
import type { Role } from '../../authorization/role.ts';

export type UserCore = Readonly<{
  id: UserId;
  email: Email;
  passwordHash: PasswordHash;
  roles: readonly Role[];
}>;

export type ActiveUser = UserCore & Readonly<{ status: 'active' }>;

export type DisabledUser = UserCore & Readonly<{ status: 'disabled'; disabledAt: Date }>;

export type User = ActiveUser | DisabledUser;
