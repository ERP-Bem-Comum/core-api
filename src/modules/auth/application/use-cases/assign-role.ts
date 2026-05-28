/**
 * assignRole - use case do modulo auth (A9). Imperative Shell (async, Result).
 *
 * Atribui um Role a um usuario, AUTORIZANDO o ator (DD-USER-07, 1a aplicacao de DD-USER-02):
 * carrega o ator -> authorize(actor, 'user:assign-role') -> carrega o target -> carrega o role ->
 * User.assignRole (idempotente) -> save. Fail-closed: ator ausente/desabilitado/sem-permissao -> forbidden.
 * Retorna { user, event }; nao publica (EventBus futuro). ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Permission from '../../domain/authorization/permission.ts';
import * as User from '../../domain/identity/user/user.ts';
import { authorize } from '../../domain/authorization/authorize.ts';
import type { UserId } from '../../domain/identity/user-id.ts';
import type { RoleId } from '../../domain/authorization/role-id.ts';
import type { ActiveUser } from '../../domain/identity/user/types.ts';
import type { RoleAssigned } from '../../domain/identity/user/events.ts';
import type {
  UserReader,
  UserRepository,
  UserRepositoryError,
} from '../../domain/identity/user/repository.ts';
import type {
  RoleRepository,
  RoleRepositoryError,
} from '../../domain/authorization/role-repository.ts';

export type AssignRoleCommand = Readonly<{
  actorId: UserId;
  targetUserId: UserId;
  roleId: RoleId;
}>;

export type AssignRoleError =
  | 'forbidden'
  | 'user-not-found'
  | 'user-disabled'
  | 'role-not-found'
  | UserRepositoryError
  | RoleRepositoryError;

export type AssignRoleOutput = Readonly<{ user: ActiveUser; event: RoleAssigned }>;

type Deps = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  roleRepo: RoleRepository;
  clock: Clock;
}>;

export const assignRole =
  (deps: Deps) =>
  async (cmd: AssignRoleCommand): Promise<Result<AssignRoleOutput, AssignRoleError>> => {
    const actor = await deps.userReader.findById(cmd.actorId);
    if (!actor.ok) return actor;
    if (actor.value === null) return err('forbidden');
    const activeActor = User.parseActive(actor.value);
    if (!activeActor.ok) return err('forbidden');

    const required = Permission.parse('user:assign-role');
    if (!required.ok) return err('forbidden');
    const authorized = authorize(activeActor.value, required.value);
    if (!authorized.ok) return err('forbidden');

    const target = await deps.userReader.findById(cmd.targetUserId);
    if (!target.ok) return target;
    if (target.value === null) return err('user-not-found');
    const activeTarget = User.parseActive(target.value);
    if (!activeTarget.ok) return err('user-disabled');

    const role = await deps.roleRepo.findById(cmd.roleId);
    if (!role.ok) return role;
    if (role.value === null) return err('role-not-found');

    const { user, event } = User.assignRole(activeTarget.value, role.value, deps.clock.now());
    const saved = await deps.userRepo.save(user);
    if (!saved.ok) return saved;

    return ok({ user, event });
  };
