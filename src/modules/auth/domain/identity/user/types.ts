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
import type { Cpf } from '../cpf.ts';
import type { Telephone } from '../telephone.ts';
import type { ProfilePhotoRef } from '../profile-photo-ref.ts';

// Campos de perfil administrativo (spec 005). NULLABLE: register-user/OIDC criam sem perfil;
// a obrigatoriedade de name/cpf/telephone vive no use case create-user-by-admin, nao no agregado.
export type UserProfile = Readonly<{
  name: string | null;
  cpf: Cpf | null;
  telephone: Telephone | null;
  photo: ProfilePhotoRef | null;
  collaboratorId: string | null;
}>;

export type UserCore = Readonly<{
  id: UserId;
  email: Email;
  passwordHash: PasswordHash;
  roles: readonly Role[];
}> &
  UserProfile;

export type ActiveUser = UserCore & Readonly<{ status: 'active' }>;

export type DisabledUser = UserCore & Readonly<{ status: 'disabled'; disabledAt: Date }>;

export type User = ActiveUser | DisabledUser;
