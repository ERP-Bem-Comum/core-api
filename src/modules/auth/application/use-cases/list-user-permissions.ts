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
import * as PermissionCatalog from '#src/modules/auth/domain/authorization/permission-catalog.ts';
import type { RbacMode } from '#src/modules/auth/domain/authorization/rbac-mode.ts';
import type { UserReader } from '#src/modules/auth/domain/identity/user/repository.ts';

type Deps = Readonly<{ userReader: UserReader; rbacMode: RbacMode }>;

export const listUserPermissions =
  (deps: Deps) =>
  async (rawUserId: string): Promise<Result<readonly string[], never>> => {
    const idR = UserId.rehydrate(rawUserId);
    if (!idR.ok) return ok([]);

    const found = await deps.userReader.findById(idR.value);
    if (!found.ok) return ok([]);
    const user = found.value;
    if (user?.status !== 'active') return ok([]);

    // ADR-0052 (bypass): todo usuario autenticado e super-usuario. O enforcement ja libera; esta
    // lista alimenta o `can()` do front, entao TEM de anunciar o catalogo inteiro — senao o front
    // esconde modulos que o backend liberaria (bug AUTH-BYPASS-ME-PERMISSIONS: financeiro oculto
    // com o bypass ligado). A degradacao graciosa acima vem ANTES de proposito: id invalido,
    // inexistente ou inativo devolve [] em qualquer modo — nao-ativo nunca e super-usuario.
    if (deps.rbacMode === 'bypass') {
      return ok(PermissionCatalog.all.map((permission) => String(permission)));
    }

    return ok(listPermissions(user).map((permission) => String(permission)));
  };
