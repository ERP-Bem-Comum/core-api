/**
 * archiveRole - use case do modulo auth (spec 006, US7): desativa (arquiva) um papel existente
 * (Role), tornando-o nao-atribuivel. Bloqueado se o papel ainda estiver atribuido a usuarios
 * (FR-012) - nesse caso retorna role-in-use e a borda orienta revogar antes (409).
 *
 * Sequencia canonica (rule application.md): validar -> fetch -> checar uso -> domain -> persist.
 * Sem EventBus (eventos diferidos). NAO estende o port (RoleRepository ja expoe isInUse, findById,
 * save - YAGNI).
 *
 * Fluxo: (a) RoleId.rehydrate(rawId) - invalido -> role-id-invalid; (b) findById - propaga erro do
 * repo; null -> role-not-found; (c) isInUse(id) - propaga erro do repo; (d) Role.archive(found,
 * inUse) - propaga role-in-use (papel ainda atribuido); (e) save -> propaga erro do repo;
 * (f) ok(Role arquivado, status archived). ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as RoleId from '../../domain/authorization/role-id.ts';
import * as Role from '../../domain/authorization/role.ts';
import type { RoleRepository } from '../../domain/authorization/role-repository.ts';

export type ArchiveRoleError =
  | 'role-id-invalid'
  | 'role-not-found'
  | 'role-in-use'
  | 'role-repo-unavailable';

type Deps = Readonly<{ roleRepository: RoleRepository }>;

export const archiveRole =
  (deps: Deps) =>
  async (rawId: string): Promise<Result<Role.Role, ArchiveRoleError>> => {
    // (a) Reidrata o id (borda nao conhece o branded RoleId). Nao-UUID -> 400 na borda.
    const roleId = RoleId.rehydrate(rawId);
    if (!roleId.ok) return err('role-id-invalid');

    // (b) Carrega o agregado. Propaga o erro do repo; ausencia -> 404.
    const found = await deps.roleRepository.findById(roleId.value);
    if (!found.ok) return found;
    if (found.value === null) return err('role-not-found');

    // (c) Verifica se o papel ainda esta atribuido (juncao auth_user_role). Propaga erro do repo.
    const inUse = await deps.roleRepository.isInUse(roleId.value);
    if (!inUse.ok) return inUse;

    // (d) Transicao de dominio: arquiva se nao estiver em uso, senao role-in-use (FR-012).
    const archived = Role.archive(found.value, inUse.value);
    if (!archived.ok) return err('role-in-use');

    // (e) Persiste o agregado arquivado.
    const saved = await deps.roleRepository.save(archived.value);
    if (!saved.ok) return saved;

    // (f) Sucesso: devolve o Role do dominio (status archived); a borda mapeia para o DTO.
    return ok(archived.value);
  };
