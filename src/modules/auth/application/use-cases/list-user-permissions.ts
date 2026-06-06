/**
 * listUserPermissions - use case do modulo auth: lista as permissões efetivas do usuário autenticado
 * (consumido pelo GET /me; o front usa para `can()`).
 *
 * Degradação graciosa (fail-closed do ponto de vista do front): qualquer condição anômala — id
 * inválido, usuário inexistente ou desabilitado, falha de leitura — devolve `[]` (sem permissões),
 * nunca quebra o /me. Result<_, never>.
 */

import { type Result, ok } from '#src/shared/primitives/result.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import { listPermissions } from '#src/modules/auth/domain/authorization/list-permissions.ts';
import type { UserReader } from '#src/modules/auth/domain/identity/user/repository.ts';

type Deps = Readonly<{ userReader: UserReader }>;

export const listUserPermissions =
  (deps: Deps) =>
  async (rawUserId: string): Promise<Result<readonly string[], never>> => {
    const idR = UserId.rehydrate(rawUserId);
    if (!idR.ok) return ok([]);

    const found = await deps.userReader.findById(idR.value);
    if (!found.ok) return ok([]);
    const user = found.value;
    if (user?.status !== 'active') return ok([]);

    return ok(listPermissions(user).map((permission) => String(permission)));
  };
