/**
 * Ports de persistencia do agregado User (modulo auth).
 *
 * Posicionados em domain/ pelo Criterio H2 (§3.H.2): ditados pela invariancia/ciclo-de-vida do User.
 * Read/write split (ADR-0026, DD-PORTS-01): `UserRepository` (escrita) separado de `UserReader` (leitura)
 * — o adapter aponta os pools writer/reader sem refactor. ASCII puro.
 */

import type { Result } from '../../../../../shared/primitives/result.ts';
import type { UserId } from '../user-id.ts';
import type { Email } from '../email.ts';
import type { User } from './types.ts';

export type UserRepositoryError = 'user-repo-unavailable' | 'email-already-registered';

export type UserRepository = Readonly<{
  save: (user: User) => Promise<Result<void, UserRepositoryError>>;
}>;

export type UserReader = Readonly<{
  findById: (id: UserId) => Promise<Result<User | null, UserRepositoryError>>;
  findByEmail: (email: Email) => Promise<Result<User | null, UserRepositoryError>>;
}>;
