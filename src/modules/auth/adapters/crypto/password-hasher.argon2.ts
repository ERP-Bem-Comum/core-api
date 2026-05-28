/**
 * Adapter argon2id de PasswordHasher (modulo auth) - via hash-wasm (WASM puro, DD-CRYPTO-01).
 *
 * Params OWASP: memorySize 19456 KiB, iterations 2, parallelism 1, hashLength 32, salt 16 bytes.
 * `outputType: 'encoded'` -> string PHC ($argon2id$...). `try/catch -> Result` na borda (regra adapters).
 * A senha em claro nunca e logada nem incluida no erro. ASCII puro.
 */

import { argon2id, argon2Verify } from 'hash-wasm';
import { randomBytes } from 'node:crypto';
import { ok, err } from '../../../../shared/primitives/result.ts';
import * as PasswordHash from '../../domain/credential/password-hash.ts';
import type { PasswordHasher } from '../../application/ports/password-hasher.ts';

const PARAMS = {
  iterations: 2,
  parallelism: 1,
  memorySize: 19456,
  hashLength: 32,
} as const;

export const makeArgon2PasswordHasher = (): PasswordHasher => ({
  hash: async (plain) => {
    try {
      const encoded = await argon2id({
        password: plain,
        salt: randomBytes(16),
        ...PARAMS,
        outputType: 'encoded',
      });
      const h = PasswordHash.fromString(encoded);
      return h.ok ? ok(h.value) : err('password-hash-failed');
    } catch {
      return err('password-hash-failed');
    }
  },
  verify: async (plain, hash) => {
    try {
      return ok(await argon2Verify({ password: plain, hash }));
    } catch {
      return err('password-verify-failed');
    }
  },
});
