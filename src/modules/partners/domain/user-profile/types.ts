/**
 * Tipos do agregado `UserProfile` (perfil de usuário). Legado `users` — porção de
 * perfil (name/cpf/telephone/imageUrl/collaboratorId); autenticação fica no módulo
 * `auth` (D5). Identidade = `userRef` (1:1 com `auth.User`; sem id próprio). Sem
 * soft-delete: o ciclo de vida ativo/inativo é do `auth.User`.
 *
 * Referências cross-módulo: `UserRef` (kernel) e `CollaboratorId` (próprio módulo).
 */

import type { UserRef } from '#src/shared/kernel/user-ref.ts';
import type { Cpf } from '#src/shared/kernel/cpf.ts';
import type { CollaboratorId } from '#src/modules/partners/domain/collaborator/collaborator-id.ts';

export type UserProfile = Readonly<{
  userRef: UserRef; // identidade (1:1 com auth.User)
  name: string;
  cpf: Cpf; // imutável após criação
  telephone: string;
  avatarUrl: string | null;
  collaboratorRef: CollaboratorId | null; // vínculo opcional ao colaborador
}>;

export type CreateUserProfileInput = Readonly<{
  userRef: UserRef;
  name: string;
  cpf: string;
  telephone: string;
  avatarUrl: string | null;
  createdAt: Date;
}>;

export type UpdateContactInput = Readonly<{
  name: string;
  telephone: string;
  avatarUrl: string | null;
}>;

// Reidratação pela borda (mapper): VOs já tipados; reconstrói sem evento.
export type RehydrateUserProfileInput = Readonly<{
  userRef: UserRef;
  name: string;
  cpf: Cpf;
  telephone: string;
  avatarUrl: string | null;
  collaboratorRef: CollaboratorId | null;
}>;
