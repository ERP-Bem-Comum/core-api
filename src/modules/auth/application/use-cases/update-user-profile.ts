/**
 * updateUserProfile - use case do modulo auth (spec 005, US4; FR-007/008/009).
 * Imperative Shell (async, Result).
 *
 * Sequencia: validate id -> fetch (404) -> validar campos presentes (VOs) -> checar unicidade
 * de email se mudou -> domain (User.updateProfile) -> persist. Edicao ATOMICA (FR-009): nenhuma
 * validacao parcial persiste; o `save` so ocorre apos todas as validacoes passarem.
 *
 * Patch parcial: campo ausente preserva o valor atual. CPF/telefone normalizados pelos VOs (FR-008).
 * Unicidade de email (FR-007): SELECT-then-UPDATE (ADR-0020). Conflito so com OUTRO usuario; mesmo
 * email do proprio = no-op. Aceita usuario active ou disabled (admin corrige cadastro de inativo).
 * ASCII puro.
 */

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { Clock } from '#src/shared/ports/clock.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as Cpf from '#src/modules/auth/domain/identity/cpf.ts';
import * as Telephone from '#src/modules/auth/domain/identity/telephone.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import { authorizeActor } from '#src/modules/auth/application/authorize-actor.ts';
import type { RbacMode } from '#src/modules/auth/domain/authorization/rbac-mode.ts';
import type { UpdateProfileInput } from '#src/modules/auth/domain/identity/user/user.ts';
import type { User as UserType, ActiveUser } from '#src/modules/auth/domain/identity/user/types.ts';
import type { UserId as UserIdType } from '#src/modules/auth/domain/identity/user-id.ts';
import type { UserProfileUpdated } from '#src/modules/auth/domain/identity/user/events.ts';
import type {
  UserReader,
  UserRepository,
  UserRepositoryError,
} from '#src/modules/auth/domain/identity/user/repository.ts';
import type {
  RoleRepository,
  RoleRepositoryError,
} from '#src/modules/auth/domain/authorization/role-repository.ts';
import {
  MASS_APPROVER_ROLE_NAME,
  resolveMassApproverRole,
} from '#src/modules/auth/application/use-cases/mass-approver-role.ts';

export type UpdateUserProfileCommand = Readonly<{
  id: string;
  name?: string;
  email?: string;
  cpf?: string;
  telephone?: string;
  collaboratorId?: string | null;
  /**
   * Executor (admin autenticado). Obrigatorio APENAS quando `massApprovalPermission` e definido
   * (autorizacao fail-closed). Ausente nos demais patches (compat com o fluxo de perfil atual).
   */
  actorId?: UserIdType;
  /**
   * Concessao/revogacao da capacidade "Aprovador em Massa" (AUTH-MASS-APPROVE-SETTABLE).
   * Ausente -> nao mexe na permissao (patch parcial, FR-009). true -> concede; false -> revoga.
   * Setar (true OU false) exige `user:assign-role` no ator (fail-closed). Idempotente.
   */
  massApprovalPermission?: boolean;
}>;

export type UpdateUserProfileError =
  | 'user-id-invalid'
  | 'user-not-found'
  | 'user-disabled'
  | 'name-required'
  | 'forbidden'
  | 'mass-approver-role-invalid'
  | Email.EmailError
  | Cpf.CpfError
  | Telephone.TelephoneError
  | 'email-already-registered'
  | UserRepositoryError
  | RoleRepositoryError;

export type UpdateUserProfileOutput = Readonly<{ user: UserType; event: UserProfileUpdated }>;

type Deps = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  roleRepo: RoleRepository;
  clock: Clock;
  /** ADR-0052 — em bypass, conceder a alçada de aprovação não exige `user:assign-role`. */
  rbacMode: RbacMode;
}>;

// AUTH-MASS-APPROVE-SETTABLE: fail-closed. Carrega o ator, exige active + `user:assign-role`.
// Em bypass (ADR-0052), a permissão é dispensada.
const authorizeMassApproval = async (
  deps: Pick<Deps, 'userReader' | 'rbacMode'>,
  actorId: UserIdType | undefined,
): Promise<Result<true, 'forbidden'>> => {
  if (actorId === undefined) return err('forbidden');
  const actor = await deps.userReader.findById(actorId);
  if (!actor.ok || actor.value === null) return err('forbidden');
  const activeActor = User.parseActive(actor.value);
  if (!activeActor.ok) return err('forbidden');
  if (!authorizeActor(deps.rbacMode, activeActor.value, 'user:assign-role').ok) {
    return err('forbidden');
  }
  return ok(true);
};

// AUTH-MASS-APPROVE-SETTABLE: concede (true) ou revoga (false) a role etl:mass-approver no target.
// Idempotente (herdado de User.assignRole/revokeRole). true resolve-ou-cria a role; false so
// revoga se o target ja tiver a role pelo name (sem criar a role a toa).
const applyMassApproval = async (
  deps: Pick<Deps, 'roleRepo'>,
  target: ActiveUser,
  grant: boolean,
  at: Date,
): Promise<Result<ActiveUser, RoleRepositoryError | 'mass-approver-role-invalid'>> => {
  if (grant) {
    const roleR = await resolveMassApproverRole({ roleRepo: deps.roleRepo });
    if (!roleR.ok) return roleR;
    return ok(User.assignRole(target, roleR.value, at).user);
  }
  // Revogar: localiza a role atribuida pelo name; ausente -> no-op.
  const current = target.roles.find((r) => r.name === MASS_APPROVER_ROLE_NAME);
  if (current === undefined) return ok(target);
  return ok(User.revokeRole(target, current.id, at).user);
};

export const updateUserProfile =
  (deps: Deps) =>
  async (
    cmd: UpdateUserProfileCommand,
  ): Promise<Result<UpdateUserProfileOutput, UpdateUserProfileError>> => {
    const idR = UserId.rehydrate(cmd.id);
    if (!idR.ok) return err('user-id-invalid');

    const found = await deps.userReader.findById(idR.value);
    if (!found.ok) return found;
    if (found.value === null) return err('user-not-found');
    const current = found.value;

    // Validacao de todos os campos presentes ANTES de qualquer escrita (atomicidade, FR-009).
    const patch: { -readonly [K in keyof UpdateProfileInput]: UpdateProfileInput[K] } = {};

    if (cmd.name !== undefined) {
      const name = cmd.name.trim();
      if (name.length === 0) return err('name-required');
      patch.name = name;
    }

    if (cmd.email !== undefined) {
      const email = Email.parse(cmd.email);
      if (!email.ok) return email;
      // Unicidade so quando o email muda de fato; mesmo email do proprio usuario = no-op.
      if (String(email.value) !== String(current.email)) {
        const existing = await deps.userReader.findByEmail(email.value);
        if (!existing.ok) return existing;
        if (existing.value !== null && existing.value.id !== current.id) {
          return err('email-already-registered');
        }
        patch.email = email.value;
      }
    }

    if (cmd.cpf !== undefined) {
      const cpf = Cpf.parse(cmd.cpf);
      if (!cpf.ok) return cpf;
      patch.cpf = cpf.value;
    }

    if (cmd.telephone !== undefined) {
      const telephone = Telephone.parse(cmd.telephone);
      if (!telephone.ok) return telephone;
      patch.telephone = telephone.value;
    }

    if (cmd.collaboratorId !== undefined) {
      patch.collaboratorId = cmd.collaboratorId;
    }

    // AUTH-MASS-APPROVE-SETTABLE: setar a flag (true OU false) exige `user:assign-role` no ator.
    // Fail-closed: autorizacao ANTES de qualquer escrita. Flag ausente -> nao carrega ator nem roleRepo.
    if (cmd.massApprovalPermission !== undefined) {
      const authorized = await authorizeMassApproval(deps, cmd.actorId);
      if (!authorized.ok) return err(authorized.error);
    }

    const now = deps.clock.now();
    const { user, event } = User.updateProfile(current, patch, now);

    // AUTH-MASS-APPROVE-SETTABLE: aplica a concessao/revogacao da role etl:mass-approver (idempotente).
    // Exige target ativo (assignRole/revokeRole operam sobre ActiveUser). Flag ausente -> sem efeito.
    let toSave: UserType = user;
    if (cmd.massApprovalPermission !== undefined) {
      const activeTarget = User.parseActive(user);
      if (!activeTarget.ok) return err('user-disabled');
      const applied = await applyMassApproval(
        deps,
        activeTarget.value,
        cmd.massApprovalPermission,
        now,
      );
      if (!applied.ok) return applied;
      toSave = applied.value;
    }

    const saved = await deps.userRepo.save(toSave);
    if (!saved.ok) return saved;

    return ok({ user: toSave, event });
  };
