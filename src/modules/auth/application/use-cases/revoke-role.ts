/**
 * revokeRole - use case do modulo auth (spec 006 US4). Par do assignRole. Imperative Shell.
 *
 * Revoga um Role de um usuario, AUTORIZANDO o ator pela MESMA permission 'user:assign-role'
 * (simetria; DD-USER-07/DD-USER-02): carrega o ator -> parseActive -> authorize -> carrega o
 * target -> parseActive. Protecao FR-010 (anti auto-lockout): se actor === target, computa o
 * estado pos-revoke e, se o ator NAO retiver 'user:assign-role', falha com 'cannot-self-lockout'
 * ANTES de salvar. Idempotente: alvo sem o role -> event null, sem save. Fail-closed.
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
import type { RoleRevoked } from '../../domain/identity/user/events.ts';
import type {
  UserReader,
  UserRepository,
  UserRepositoryError,
} from '../../domain/identity/user/repository.ts';
import type {
  RoleRepository,
  RoleRepositoryError,
} from '../../domain/authorization/role-repository.ts';

export type RevokeRoleCommand = Readonly<{
  actorId: UserId;
  targetUserId: UserId;
  roleId: RoleId;
}>;

export type RevokeRoleError =
  | 'forbidden'
  | 'user-not-found'
  | 'user-disabled'
  | 'cannot-self-lockout'
  | UserRepositoryError
  | RoleRepositoryError;

export type RevokeRoleOutput = Readonly<{ user: ActiveUser; event: RoleRevoked | null }>;

type Deps = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  roleRepo: RoleRepository;
  clock: Clock;
}>;

export const revokeRole =
  (deps: Deps) =>
  async (cmd: RevokeRoleCommand): Promise<Result<RevokeRoleOutput, RevokeRoleError>> => {
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

    // Protecao FR-010: o ator nao pode revogar de SI a propria capacidade de gestao de acessos.
    // Computa o estado pos-revoke e barra se o ator perde 'user:assign-role'. Antes de qualquer save.
    if (cmd.actorId === cmd.targetUserId) {
      const { user: afterRevoke } = User.revokeRole(
        activeTarget.value,
        cmd.roleId,
        deps.clock.now(),
      );
      if (!authorize(afterRevoke, required.value).ok) return err('cannot-self-lockout');
    }

    const { user, event } = User.revokeRole(activeTarget.value, cmd.roleId, deps.clock.now());
    // Idempotente: sem mudanca (event null) -> no-op, sem save.
    if (event === null) return ok({ user, event });

    const saved = await deps.userRepo.save(user);
    if (!saved.ok) return saved;

    return ok({ user, event });
  };
