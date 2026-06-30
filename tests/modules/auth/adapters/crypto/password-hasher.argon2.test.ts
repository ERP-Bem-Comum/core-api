/**
 * W0 (RED) - contract-suite + casos especificos do argon2id (hash-wasm). Ticket: X1.
 *
 * CA4 (salt -> hashes diferentes) e CA5 (formato PHC) sao especificos do argon2 real. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { makeArgon2PasswordHasher } from '#src/modules/auth/adapters/crypto/password-hasher.argon2.ts';
import { runPasswordHasherContract } from '../../application/ports/password-hasher.contract.ts';
import * as Password from '#src/modules/auth/domain/credential/password-policy.ts';

runPasswordHasherContract('Argon2id (hash-wasm)', { make: () => makeArgon2PasswordHasher() });

const password = (raw: string): Password.Password => {
  const r = Password.parse(raw);
  if (!r.ok) throw new Error('fixture');
  return r.value;
};

describe('Argon2 — especificos', () => {
  it('CA4: hash do mesmo plain produz hashes diferentes (salt aleatorio)', async () => {
    const hasher = makeArgon2PasswordHasher();
    const plain = password('super-secret-123');
    const a = await hasher.hash(plain);
    const b = await hasher.hash(plain);
    assert.equal(a.ok && b.ok, true);
    if (a.ok && b.ok) assert.notEqual(a.value, b.value);
  });

  it('CA5: hash no formato PHC argon2id', async () => {
    const hasher = makeArgon2PasswordHasher();
    const r = await hasher.hash(password('super-secret-123'));
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.startsWith('$argon2id$'), true);
  });
});
