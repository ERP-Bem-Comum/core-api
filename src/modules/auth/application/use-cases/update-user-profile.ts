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
import type { UpdateProfileInput } from '#src/modules/auth/domain/identity/user/user.ts';
import type { User as UserType } from '#src/modules/auth/domain/identity/user/types.ts';
import type { UserProfileUpdated } from '#src/modules/auth/domain/identity/user/events.ts';
import type {
  UserReader,
  UserRepository,
  UserRepositoryError,
} from '#src/modules/auth/domain/identity/user/repository.ts';

export type UpdateUserProfileCommand = Readonly<{
  id: string;
  name?: string;
  email?: string;
  cpf?: string;
  telephone?: string;
  collaboratorId?: string | null;
}>;

export type UpdateUserProfileError =
  | 'user-id-invalid'
  | 'user-not-found'
  | 'name-required'
  | Email.EmailError
  | Cpf.CpfError
  | Telephone.TelephoneError
  | 'email-already-registered'
  | UserRepositoryError;

export type UpdateUserProfileOutput = Readonly<{ user: UserType; event: UserProfileUpdated }>;

type Deps = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  clock: Clock;
}>;

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

    const { user, event } = User.updateProfile(current, patch, deps.clock.now());

    const saved = await deps.userRepo.save(user);
    if (!saved.ok) return saved;

    return ok({ user, event });
  };
