/**
 * registerUser - use case do modulo auth (A4). Imperative Shell (async, Result).
 *
 * Sequencia: validate (Email/Password) -> fetch (unicidade) -> hash (port) -> domain (User.register)
 * -> persist. Retorna { user, event }; NAO publica (auth ainda sem EventBus/outbox — o evento fica
 * no output para transporte futuro). Senha em claro nunca persiste (DD-USER-04). ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as Email from '../../domain/identity/email.ts';
import * as Password from '../../domain/credential/password-policy.ts';
import * as UserId from '../../domain/identity/user-id.ts';
import * as User from '../../domain/identity/user/user.ts';
import type { ActiveUser } from '../../domain/identity/user/types.ts';
import type { UserRegistered } from '../../domain/identity/user/events.ts';
import type {
  UserRepository,
  UserReader,
  UserRepositoryError,
} from '../../domain/identity/user/repository.ts';
import type { PasswordHasher, PasswordHasherError } from '../ports/password-hasher.ts';

export type RegisterUserCommand = Readonly<{ email: string; password: string }>;

export type RegisterUserError =
  | Email.EmailError
  | Password.PasswordPolicyError
  | 'email-already-registered'
  | PasswordHasherError
  | UserRepositoryError;

export type RegisterUserOutput = Readonly<{ user: ActiveUser; event: UserRegistered }>;

type Deps = Readonly<{
  userReader: UserReader;
  userRepo: UserRepository;
  passwordHasher: PasswordHasher;
  clock: Clock;
}>;

export const registerUser =
  (deps: Deps) =>
  async (cmd: RegisterUserCommand): Promise<Result<RegisterUserOutput, RegisterUserError>> => {
    const email = Email.parse(cmd.email);
    if (!email.ok) return email;

    const password = Password.parse(cmd.password);
    if (!password.ok) return password;

    const existing = await deps.userReader.findByEmail(email.value);
    if (!existing.ok) return existing;
    if (existing.value !== null) return err('email-already-registered');

    const hashed = await deps.passwordHasher.hash(password.value);
    if (!hashed.ok) return hashed;

    const { user, event } = User.register(
      { id: UserId.generate(), email: email.value, passwordHash: hashed.value, roles: [] },
      deps.clock.now(),
    );

    const saved = await deps.userRepo.save(user);
    if (!saved.ok) return saved;

    return ok({ user, event });
  };
