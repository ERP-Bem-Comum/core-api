/**
 * createUserByAdmin - use case do modulo auth (spec 005, US3; FR-005/006/007/016).
 * Imperative Shell (async, Result). Design: security-backend-expert.
 *
 * Sequencia: validate (Email/Cpf/Telephone/name) -> unicidade de email -> domain (User.create)
 * -> persist -> emitir token de ativacao -> enviar convite. Perfil completo na criacao; a senha
 * NUNCA e definida pelo admin.
 *
 * Seguranca:
 * - `unusablePasswordHash`: hash de bytes aleatorios gerado no composition root e injetado aqui.
 *   Ninguem conhece o plaintext; authenticate-user.verify() retorna false -> invalid-credentials.
 *   Apos o convite concluido (confirmPasswordReset), User.changePassword substitui o placeholder.
 * - Unicidade de email ANTES de persistir (SELECT-then-INSERT, ADR-0020); conflito visivel ao admin
 *   (autenticado + user:create) nao e enumeracao de endpoint publico.
 * - Convite disparado dentro do use case (fail-closed): erro no envio propaga.
 * - `activationUrl` construida de `activationBaseUrl` confiavel (config), NUNCA de header Host.
 * - `createdByAdminId` no evento para auditoria (sem PII/hash no payload, DD-USER-05).
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Email from '../../domain/identity/email.ts';
import * as Cpf from '../../domain/identity/cpf.ts';
import * as Telephone from '../../domain/identity/telephone.ts';
import * as UserId from '../../domain/identity/user-id.ts';
import * as ResetToken from '../../domain/session/password-reset-token.ts';
import * as ResetTokenId from '../../domain/session/password-reset-token-id.ts';
import * as User from '../../domain/identity/user/user.ts';
import type { ActiveUser } from '../../domain/identity/user/types.ts';
import type { UserCreated } from '../../domain/identity/user/events.ts';
import type { UserId as UserIdType } from '../../domain/identity/user-id.ts';
import type { PasswordHash } from '../../domain/credential/password-hash.ts';
import type { ProfilePhotoRef } from '../../domain/identity/profile-photo-ref.ts';
import type {
  UserRepository,
  UserReader,
  UserRepositoryError,
} from '../../domain/identity/user/repository.ts';
import type {
  PasswordResetTokenRepository,
  PasswordResetTokenRepositoryError,
} from '../../domain/session/password-reset-token-repository.ts';
import type { PasswordResetTokenMinter } from '../ports/password-reset-token-minter.ts';
import type { InviteMailer, InviteMailerError } from '../ports/invite-mailer.ts';

export type CreateUserByAdminCommand = Readonly<{
  /** Executor (admin autenticado); gravado no evento UserCreated para auditoria. */
  adminId: UserIdType;
  name: string;
  cpf: string;
  email: string;
  telephone: string;
  photo?: ProfilePhotoRef | null;
}>;

export type CreateUserByAdminError =
  | Email.EmailError
  | Cpf.CpfError
  | Telephone.TelephoneError
  | 'name-required'
  | 'email-already-registered'
  | UserRepositoryError
  | PasswordResetTokenRepositoryError
  | InviteMailerError;

export type CreateUserByAdminOutput = Readonly<{ user: ActiveUser; event: UserCreated }>;

type Deps = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  resetTokenRepo: PasswordResetTokenRepository;
  minter: PasswordResetTokenMinter;
  inviteMailer: InviteMailer;
  clock: Clock;
  /** Hash placeholder (composition root). Nunca autentica; nunca logado/exposto. */
  unusablePasswordHash: PasswordHash;
  /** TTL do token de ativacao (s). Convite e mais generoso que reset (ex.: 7 dias). */
  inviteTtlSeconds: number;
  /** Origem confiavel do link (config). NUNCA header Host (anti Host-Header-Injection). */
  activationBaseUrl: string;
}>;

export const createUserByAdmin =
  (deps: Deps) =>
  async (
    cmd: CreateUserByAdminCommand,
  ): Promise<Result<CreateUserByAdminOutput, CreateUserByAdminError>> => {
    if (cmd.name.trim().length === 0) return err('name-required');

    const email = Email.parse(cmd.email);
    if (!email.ok) return email;
    const cpf = Cpf.parse(cmd.cpf);
    if (!cpf.ok) return cpf;
    const telephone = Telephone.parse(cmd.telephone);
    if (!telephone.ok) return telephone;

    const existing = await deps.userReader.findByEmail(email.value);
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('email-already-registered');

    const now = deps.clock.now();
    const newUserId = UserId.generate();

    const { user, event } = User.create(
      {
        id: newUserId,
        email: email.value,
        unusablePasswordHash: deps.unusablePasswordHash,
        name: cmd.name.trim(),
        cpf: cpf.value,
        telephone: telephone.value,
        photo: cmd.photo ?? null,
        createdByAdminId: cmd.adminId,
      },
      now,
    );

    const saved = await deps.userRepo.save(user);
    if (!saved.ok) return saved;

    // Token de ativacao (mesmo mecanismo do reset). Usuario novo -> sem tokens pendentes.
    const secret = deps.minter.mint();
    const issued = ResetToken.issue({
      id: ResetTokenId.generate(),
      userId: newUserId,
      tokenHash: secret.tokenHash,
      requestedAt: now,
      expiresAt: new Date(now.getTime() + deps.inviteTtlSeconds * 1000),
    });
    if (!issued.ok) return err('password-reset-token-repo-unavailable');

    const savedToken = await deps.resetTokenRepo.save(issued.value);
    if (!savedToken.ok) return savedToken;

    // URL de ativacao de origem confiavel (config), nunca derivada de header Host.
    const activationUrl = `${deps.activationBaseUrl}?token=${secret.token}`;
    const invited = await deps.inviteMailer.sendInvite({
      email: cmd.email,
      activationUrl,
      recipientName: cmd.name.trim(),
    });
    if (!invited.ok) return invited;

    return ok({ user, event });
  };
