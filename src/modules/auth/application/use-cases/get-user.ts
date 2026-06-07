/**
 * getUser - use case do modulo auth (spec 005, US2): detalhe administrativo de um usuario.
 *
 * Reusa UserReader.findById (reidrata o perfil via mapper). Compoe o read model UserDetail:
 * campos de perfil + massApprovalPermission (read-only, derivado das roles — FR-015) + active
 * (derivado de status). collaboratorId e opaco (FR-017). Result na borda, sem throw. ASCII puro.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import type { UserReader } from '#src/modules/auth/domain/identity/user/repository.ts';

const MASS_APPROVE_PERMISSION = 'contract:mass-approve';

export type UserDetail = Readonly<{
  id: string;
  name: string | null;
  email: string;
  cpf: string | null;
  telephone: string | null;
  imageUrl: string | null;
  active: boolean;
  massApprovalPermission: boolean;
  collaboratorId: string | null;
}>;

export type GetUserError = 'user-id-invalid' | 'user-not-found';

type Deps = Readonly<{ userReader: UserReader }>;

export const getUser =
  (deps: Deps) =>
  async (rawId: string): Promise<Result<UserDetail, GetUserError>> => {
    const idR = UserId.rehydrate(rawId);
    if (!idR.ok) return err('user-id-invalid');

    const found = await deps.userReader.findById(idR.value);
    // Falha de leitura ou ausencia -> not-found (fail-closed; nao vaza dado nem detalhe de infra).
    if (!found.ok || found.value === null) return err('user-not-found');
    const user = found.value;

    // massApprovalPermission: tem a permission 'contract:mass-approve' em alguma role?
    // Computado direto das roles (presentes em ActiveUser e DisabledUser) — listPermissions
    // exige ActiveUser, mas o detalhe deve funcionar tambem para usuarios desativados.
    const massApprovalPermission = user.roles
      .flatMap((role) => role.permissions)
      .some((permission) => String(permission) === MASS_APPROVE_PERMISSION);

    return ok({
      id: String(user.id),
      name: user.name,
      email: String(user.email),
      cpf: user.cpf === null ? null : String(user.cpf),
      telephone: user.telephone === null ? null : String(user.telephone),
      imageUrl: user.photo === null ? null : String(user.photo),
      active: user.status === 'active',
      massApprovalPermission,
      collaboratorId: user.collaboratorId,
    });
  };
