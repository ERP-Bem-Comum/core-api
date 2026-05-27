/**
 * Port de persistencia do agregado Role (modulo auth).
 *
 * Posicionado em domain/ pelo Criterio H2 (§3.H.2). Diferente do User, Role usa 1 port
 * (sem read/write split — DD-PORTS-01). ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { RoleId } from './role-id.ts';
import type { Role } from './role.ts';

export type RoleRepositoryError = 'role-repo-unavailable';

export type RoleRepository = Readonly<{
  save: (role: Role) => Promise<Result<void, RoleRepositoryError>>;
  findById: (id: RoleId) => Promise<Result<Role | null, RoleRepositoryError>>;
  list: () => Promise<Result<readonly Role[], RoleRepositoryError>>;
}>;
