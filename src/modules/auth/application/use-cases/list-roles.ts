/**
 * listRoles - use case do modulo auth (spec 006, US3): lista todos os papeis (Role) com suas
 * permissoes, para a gestao administrativa de acessos (permission role:read na borda).
 *
 * Devolve o agregado de dominio cru (Role[]); o mapeamento p/ o DTO HTTP ({ id, name, active,
 * permissions }) fica na borda (roles-plugin.ts). Apenas delega ao port; o erro do repositorio
 * propaga sem reescrita. ASCII puro.
 */

import type { Result } from '#src/shared/primitives/result.ts';
import type { RoleRepository } from '#src/modules/auth/domain/authorization/role-repository.ts';
import type { Role } from '#src/modules/auth/domain/authorization/role.ts';

type Deps = Readonly<{ roleRepository: RoleRepository }>;

export const listRoles =
  (deps: Deps) => async (): Promise<Result<readonly Role[], 'role-repo-unavailable'>> =>
    deps.roleRepository.list();
