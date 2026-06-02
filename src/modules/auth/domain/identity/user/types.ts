/**
 * Tipos do agregado User (modulo auth).
 *
 * status como uniao refinada (DD-USER-01): ActiveUser | DisabledUser. `disabledAt`
 * obrigatorio no estado desabilitado (estados eliminam null). Agregado NAO-brandado (3.A.1).
 *
 * DD-USER-OIDC: passwordHash e `PasswordHash | null`. `null` modela usuario federado/OIDC
 * (sem credencial local) — nunca autentica por senha. O `| null` (nao opcional `?`) forca o
 * compilador a tratar a ausencia em todo consumidor (fail-closed por tipo).
 * ASCII puro.
 */

import type { UserId } from '../user-id.ts';
import type { Email } from '../email.ts';
import type { PasswordHash } from '../../credential/password-hash.ts';
import type { Role } from '../../authorization/role.ts';

export type UserCore = Readonly<{
  id: UserId;
  email: Email;
  passwordHash: PasswordHash | null;
  roles: readonly Role[];
}>;

export type ActiveUser = UserCore & Readonly<{ status: 'active' }>;

export type DisabledUser = UserCore & Readonly<{ status: 'disabled'; disabledAt: Date }>;

export type User = ActiveUser | DisabledUser;
