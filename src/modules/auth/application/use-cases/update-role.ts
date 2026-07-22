/**
 * updateRole - use case do modulo auth (spec 006, US6): edita um papel existente (Role) por
 * patch parcial - renomeia e/ou substitui o conjunto de permissions, para a gestao
 * administrativa de acessos (permission role:update na borda).
 *
 * Sequencia canonica (rule application.md): validar -> fetch -> domain -> persist. Sem EventBus
 * (eventos diferidos). A propagacao as permissoes efetivas dos usuarios (FR-007) e AUTOMATICA
 * pela juncao auth_user_role: ao reler um usuario seus roles ja vem atualizados do repo - nada
 * extra aqui. Unicidade de nome via repo.list() + filtro (NAO estende o port - YAGNI, ADR-0020
 * sem UNIQUE), EXCLUINDO o proprio role (mesmo id nao conta como duplicata). A comparacao usa o
 * RoleName ja normalizado (trim + colapso de espacos; case-sensitive - ver role-name.ts).
 *
 * Fluxo: (a) RoleId.rehydrate(id) - invalido -> role-id-invalid; (b) findById - propaga erro do
 * repo; null -> role-not-found; (c) parte de `found`; (d) se name presente: Role.rename (propaga
 * name-invalid), depois unicidade via list() excluindo o proprio id -> role-name-duplicate;
 * (e) se permissions presente: parse cada string (invalida -> role-permission-not-in-catalog) +
 * Role.setPermissions (valida ⊆ catalogo); (f) save -> propaga; (g) ok(Role). Patch parcial com
 * exactOptionalPropertyTypes: trata name?/permissions? com checagem `!== undefined`. ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Permission from '../../domain/authorization/permission.ts';
import * as RoleId from '../../domain/authorization/role-id.ts';
import * as Role from '../../domain/authorization/role.ts';
import type { RoleRepository } from '../../domain/authorization/role-repository.ts';

export type UpdateRoleCommand = Readonly<{
  id: string;
  name?: string;
  permissions?: readonly string[];
  approvalLimitCents?: number | null;
}>;

export type UpdateRoleError =
  | 'role-id-invalid'
  | 'role-not-found'
  | 'role-name-invalid'
  | 'role-permission-not-in-catalog'
  | 'role-name-duplicate'
  | 'role-approval-limit-invalid'
  | 'role-repo-unavailable';

type Deps = Readonly<{ roleRepository: RoleRepository }>;

export const updateRole =
  (deps: Deps) =>
  async (cmd: UpdateRoleCommand): Promise<Result<Role.Role, UpdateRoleError>> => {
    // (a) Reidrata o id (borda nao conhece o branded RoleId). Nao-UUID -> 400 na borda.
    const roleId = RoleId.rehydrate(cmd.id);
    if (!roleId.ok) return err('role-id-invalid');

    // (b) Carrega o agregado. Propaga o erro do repo; ausencia -> 404.
    const found = await deps.roleRepository.findById(roleId.value);
    if (!found.ok) return found;
    if (found.value === null) return err('role-not-found');

    // (c) Estado corrente; cada ramo do patch reatribui `next` imutavelmente.
    let next = found.value;

    // (d) Renomeacao (opcional). Role.rename valida o nome (RoleName); depois checa unicidade
    // contra os OUTROS papeis (mesmo id e o proprio role, nao conta como duplicata).
    if (cmd.name !== undefined) {
      const renamed = Role.rename(next, cmd.name);
      if (!renamed.ok) return err('role-name-invalid');

      const existing = await deps.roleRepository.list();
      if (!existing.ok) return existing;
      const duplicate = existing.value.some(
        (role) => role.id !== renamed.value.id && role.name === renamed.value.name,
      );
      if (duplicate) return err('role-name-duplicate');

      next = renamed.value;
    }

    // (e) Substituicao de permissions (opcional). Parse cada string (formato/catalogo invalido ->
    // 422) e Role.setPermissions valida o conjunto ⊆ catalogo.
    if (cmd.permissions !== undefined) {
      const permissions: Permission.Permission[] = [];
      for (const raw of cmd.permissions) {
        const parsed = Permission.parse(raw);
        if (!parsed.ok) return err('role-permission-not-in-catalog');
        permissions.push(parsed.value);
      }
      const updated = Role.setPermissions(next, permissions);
      if (!updated.ok) return err('role-permission-not-in-catalog');
      next = updated.value;
    }

    // (e2) Alcada de aprovacao (opcional). Presente (incl. null) define/zera; Money valida >= 0.
    if (cmd.approvalLimitCents !== undefined) {
      const limited = Role.setApprovalLimit(next, cmd.approvalLimitCents);
      if (!limited.ok) return err('role-approval-limit-invalid');
      next = limited.value;
    }

    // (f) Persiste o agregado editado.
    const saved = await deps.roleRepository.save(next);
    if (!saved.ok) return saved;

    // (g) Sucesso: devolve o Role do dominio; a borda mapeia para o DTO.
    return ok(next);
  };
