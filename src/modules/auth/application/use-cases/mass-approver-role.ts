/**
 * Role compartilhado de aprovacao em massa (modulo auth) - SSoT da capacidade etl:mass-approver.
 *
 * Extraido de provision-legacy-user.ts (AUTH-MASS-APPROVE-SETTABLE) para reuso DRY entre:
 *   - provisionLegacyUser (bootstrap ETL)
 *   - createUserByAdmin / updateUserProfile (flag massApprovalPermission setavel)
 *
 * `resolveMassApproverRole` faz busca-ou-cria por name (reuso idempotente, sem role explosion):
 * o Role nasce com a unica permission contract:mass-approve (D15). Capacidade, nao identidade.
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as Role from '../../domain/authorization/role.ts';
import * as RoleId from '../../domain/authorization/role-id.ts';
import * as Permission from '../../domain/authorization/permission.ts';
import type {
  RoleRepository,
  RoleRepositoryError,
} from '../../domain/authorization/role-repository.ts';
import { CONTRACT_PERMISSION } from '../../../contracts/public-api/permissions.ts';

// Nome canonico do Role compartilhado de aprovacao em massa (D15). Capacidade, nao identidade.
export const MASS_APPROVER_ROLE_NAME = 'etl:mass-approver';

export type ResolveMassApproverRoleError = RoleRepositoryError | 'mass-approver-role-invalid';

export type ResolveMassApproverRoleDeps = Readonly<{ roleRepo: RoleRepository }>;

// Resolve o Role compartilhado por name (reuso idempotente); cria + persiste se ausente.
export const resolveMassApproverRole = async (
  deps: ResolveMassApproverRoleDeps,
): Promise<Result<Role.Role, ResolveMassApproverRoleError>> => {
  const listed = await deps.roleRepo.list();
  if (!listed.ok) return err(listed.error);

  const existing = listed.value.find((r) => r.name === MASS_APPROVER_ROLE_NAME);
  if (existing !== undefined) return ok(existing);

  const permR = Permission.parse(CONTRACT_PERMISSION.massApprove);
  if (!permR.ok) return err('mass-approver-role-invalid');

  const roleR = Role.create({
    id: RoleId.generate(),
    name: MASS_APPROVER_ROLE_NAME,
    permissions: [permR.value],
  });
  if (!roleR.ok) return err('mass-approver-role-invalid');

  const saved = await deps.roleRepo.save(roleR.value);
  if (!saved.ok) return err(saved.error);

  return ok(roleR.value);
};
