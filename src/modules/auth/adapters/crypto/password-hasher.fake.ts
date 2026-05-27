/**
 * Adapter FAKE de PasswordHasher (modulo auth) - sha256 + timingSafeEqual (node:crypto).
 *
 * Determinístico e one-way, ZERO dep, para testes/CLI/use cases. NAO e argon2 — nao usar em producao.
 * NAO armazena a senha em claro (sha256 e one-way). ASCII puro.
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { ok, err } from '../../../../shared/primitives/result.ts';
import * as PasswordHash from '../../domain/credential/password-hash.ts';
import type { PasswordHasher } from '../../application/ports/password-hasher.ts';

const FAKE_PREFIX = 'fake-sha256:';

const digest = (plain: string): string =>
  `${FAKE_PREFIX}${createHash('sha256').update(plain).digest('hex')}`;

export const makeFakePasswordHasher = (): PasswordHasher => ({
  hash: async (plain) => {
    const h = PasswordHash.fromString(digest(plain));
    return h.ok ? ok(h.value) : err('password-hash-failed');
  },
  verify: async (plain, hash) => {
    const expected = Buffer.from(digest(plain));
    const actual = Buffer.from(hash);
    const equal = expected.length === actual.length && timingSafeEqual(expected, actual);
    return ok(equal);
  },
});
