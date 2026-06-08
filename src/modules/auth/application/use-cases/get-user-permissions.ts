/**
 * getUserPermissions - use case do modulo auth (spec 006, US1): lista as permissoes efetivas
 * (uniao das roles, deduplicada) de um usuario qualquer, para a gestao administrativa de acessos.
 *
 * Difere do listUserPermissions (GET /me): aqui o erro e explicito (Result com union), pois a borda
 * administrativa mapeia 400 (id invalido) e 404 (inexistente) — fail-closed, sem vazar infra. Cobre
 * usuario active OU disabled (listPermissions opera sobre UserCore). ASCII puro.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import { listPermissions } from '#src/modules/auth/domain/authorization/list-permissions.ts';
import type { UserReader } from '#src/modules/auth/domain/identity/user/repository.ts';

export type GetUserPermissionsError = 'user-id-invalid' | 'user-not-found';

type Deps = Readonly<{ userReader: UserReader }>;

export const getUserPermissions =
  (deps: Deps) =>
  async (rawUserId: string): Promise<Result<readonly string[], GetUserPermissionsError>> => {
    const idR = UserId.rehydrate(rawUserId);
    if (!idR.ok) return err('user-id-invalid');

    const found = await deps.userReader.findById(idR.value);
    // Falha de leitura ou ausencia -> not-found (fail-closed; nao vaza dado nem detalhe de infra).
    if (!found.ok || found.value === null) return err('user-not-found');

    return ok(listPermissions(found.value).map((permission) => String(permission)));
  };
