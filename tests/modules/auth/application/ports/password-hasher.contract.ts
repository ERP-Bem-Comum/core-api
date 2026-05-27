/**
 * Suite de contrato compartilhada para PasswordHasher (modulo auth).
 * Comum a fake (sha256) e argon2 (hash-wasm). NAO executa direto. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type { PasswordHasher } from '#src/modules/auth/application/ports/password-hasher.ts';
import * as Password from '#src/modules/auth/domain/credential/password-policy.ts';

export interface PasswordHasherFactory {
  make: () => PasswordHasher;
}

const password = (raw: string): Password.Password => {
  const r = Password.parse(raw);
  if (!r.ok) throw new Error('fixture password');
  return r.value;
};

export const runPasswordHasherContract = (label: string, factory: PasswordHasherFactory): void => {
  describe(`PasswordHasher contract — ${label}`, () => {
    it('CA1: hash produz PasswordHash nao-vazio', async () => {
      const hasher = factory.make();
      const r = await hasher.hash(password('super-secret-123'));
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.value.length > 0, true);
    });

    it('CA2: verify de senha correta retorna ok(true)', async () => {
      const hasher = factory.make();
      const plain = password('super-secret-123');
      const hashed = await hasher.hash(plain);
      assert.equal(hashed.ok, true);
      if (!hashed.ok) return;
      const v = await hasher.verify(plain, hashed.value);
      assert.equal(v.ok, true);
      if (v.ok) assert.equal(v.value, true);
    });

    it('CA3: verify de senha errada retorna ok(false)', async () => {
      const hasher = factory.make();
      const hashed = await hasher.hash(password('super-secret-123'));
      assert.equal(hashed.ok, true);
      if (!hashed.ok) return;
      const v = await hasher.verify(password('outra-senha-999'), hashed.value);
      assert.equal(v.ok, true);
      if (v.ok) assert.equal(v.value, false);
    });
  });
};
