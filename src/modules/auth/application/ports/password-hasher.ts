/**
 * Port PasswordHasher (modulo auth) - capacidade tecnica (DD-PORTS-01), em application/ports/.
 *
 * Recebe `Password` (claro validado pela politica) e produz `PasswordHash` (opaco). O dominio
 * NUNCA hasheia nem ve senha em claro (DD-USER-04); o hashing vive no adapter (argon2id, DD-CRYPTO-01).
 * ASCII puro.
 */

import type { Result } from '../../../../shared/primitives/result.ts';
import type { Password } from '../../domain/credential/password-policy.ts';
import type { PasswordHash } from '../../domain/credential/password-hash.ts';

export type PasswordHasherError = 'password-hash-failed' | 'password-verify-failed';

export type PasswordHasher = Readonly<{
  hash: (plain: Password) => Promise<Result<PasswordHash, PasswordHasherError>>;
  verify: (plain: Password, hash: PasswordHash) => Promise<Result<boolean, PasswordHasherError>>;
}>;
