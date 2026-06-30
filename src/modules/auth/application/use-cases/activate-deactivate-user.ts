/**
 * activateUser / deactivateUser - use cases do modulo auth (spec 005, US5; FR-010/011).
 * Imperative Shell (async, Result). Reusa o dominio existente User.enable / User.disable.
 *
 * Idempotencia (FR-010, AC3): o use case le o estado atual e so transita se necessario; repetir a
 * operacao no estado-alvo e no-op (sucesso, `event: null`, sem `save`). Protecao de auto-desativacao
 * (data-model.md:51): o ator nao pode desativar a propria conta (evita lockout). ASCII puro.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import type { User as UserType } from '#src/modules/auth/domain/identity/user/types.ts';
import type { UserDisabled, UserEnabled } from '#src/modules/auth/domain/identity/user/events.ts';
import type {
  UserReader,
  UserRepository,
  UserRepositoryError,
} from '#src/modules/auth/domain/identity/user/repository.ts';

type Deps = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  clock: Clock;
}>;

// ─── deactivateUser ────────────────────────────────────────────────────────────

export type DeactivateUserCommand = Readonly<{
  /** Ator (admin autenticado, do JWT). Usado na protecao de auto-desativacao. */
  actorId: string;
  targetId: string;
}>;

export type DeactivateUserError =
  | 'user-id-invalid'
  | 'user-not-found'
  | 'cannot-deactivate-self'
  | UserRepositoryError;

// event null = no-op idempotente (ja estava desativado).
export type DeactivateUserOutput = Readonly<{ user: UserType; event: UserDisabled | null }>;

export const deactivateUser =
  (deps: Deps) =>
  async (
    cmd: DeactivateUserCommand,
  ): Promise<Result<DeactivateUserOutput, DeactivateUserError>> => {
    const idR = UserId.rehydrate(cmd.targetId);
    if (!idR.ok) return err('user-id-invalid');

    const found = await deps.userReader.findById(idR.value);
    if (!found.ok) return found;
    if (found.value === null) return err('user-not-found');
    const current = found.value;

    if (cmd.actorId === cmd.targetId) return err('cannot-deactivate-self');

    // Idempotente: ja desativado -> no-op.
    if (current.status === 'disabled') return ok({ user: current, event: null });

    const { user, event } = User.disable(current, deps.clock.now());
    const saved = await deps.userRepo.save(user);
    if (!saved.ok) return saved;
    return ok({ user, event });
  };

// ─── activateUser ──────────────────────────────────────────────────────────────

export type ActivateUserCommand = Readonly<{ targetId: string }>;

export type ActivateUserError = 'user-id-invalid' | 'user-not-found' | UserRepositoryError;

// event null = no-op idempotente (ja estava ativo).
export type ActivateUserOutput = Readonly<{ user: UserType; event: UserEnabled | null }>;

export const activateUser =
  (deps: Deps) =>
  async (cmd: ActivateUserCommand): Promise<Result<ActivateUserOutput, ActivateUserError>> => {
    const idR = UserId.rehydrate(cmd.targetId);
    if (!idR.ok) return err('user-id-invalid');

    const found = await deps.userReader.findById(idR.value);
    if (!found.ok) return found;
    if (found.value === null) return err('user-not-found');
    const current = found.value;

    // Idempotente: ja ativo -> no-op.
    if (current.status === 'active') return ok({ user: current, event: null });

    const { user, event } = User.enable(current, deps.clock.now());
    const saved = await deps.userRepo.save(user);
    if (!saved.ok) return saved;
    return ok({ user, event });
  };
