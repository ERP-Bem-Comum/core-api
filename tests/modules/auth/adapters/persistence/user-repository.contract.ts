/**
 * Suite de contrato compartilhada para UserRepository + UserReader (modulo auth).
 *
 * Recebe um factory que devolve { repository, reader } sobre o mesmo store. Toda implementacao
 * (InMemory, Drizzle/MySQL futuro) passa pelos MESMOS cenarios. NAO executa direto (sem .test.ts).
 *
 * ASCII puro.
 */

import { describe, it, beforeEach } from 'node:test';
import { strict as assert } from 'node:assert';

import type {
  UserRepository,
  UserReader,
} from '#src/modules/auth/domain/identity/user/repository.ts';
import type { ActiveUser } from '#src/modules/auth/domain/identity/user/types.ts';
import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';

interface UserRepoSetup {
  repository: UserRepository;
  reader: UserReader;
  teardown?: () => Promise<void>;
}

// Aceita setup sincrono (InMemory) ou assincrono (Drizzle/MySQL futuro) — `await` lida com ambos.
export interface UserRepoFactory {
  make: () => UserRepoSetup | Promise<UserRepoSetup>;
}

const AT = new Date('2026-05-27T12:00:00.000Z');

const buildActive = (rawEmail: string): ActiveUser => {
  const email = Email.parse(rawEmail);
  const hash = PasswordHash.fromString('$argon2id$x');
  if (!email.ok || !hash.ok) throw new Error('fixture VO invalido');
  const { user } = User.register(
    { id: UserId.generate(), email: email.value, passwordHash: hash.value, roles: [] },
    AT,
  );
  return user;
};

export const runUserRepositoryContract = (label: string, factory: UserRepoFactory): void => {
  describe(`UserRepository contract — ${label}`, () => {
    let repository: UserRepository;
    let reader: UserReader;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repository = built.repository;
      reader = built.reader;
      teardown = built.teardown;
    });

    const cleanup = async (): Promise<void> => {
      if (teardown) await teardown();
    };

    it('CA1: save -> findById retorna o user salvo', async () => {
      const user = buildActive('user@example.com');
      const saved = await repository.save(user);
      assert.equal(saved.ok, true);

      const found = await reader.findById(user.id);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value?.id, user.id);
      await cleanup();
    });

    it('CA2: findById de id inexistente retorna ok(null)', async () => {
      const found = await reader.findById(UserId.generate());
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value, null);
      await cleanup();
    });

    it('CA3: save -> findByEmail retorna o user', async () => {
      const user = buildActive('person@example.com');
      await repository.save(user);

      const found = await reader.findByEmail(user.email);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value?.id, user.id);
      await cleanup();
    });

    it('CA4: findByEmail inexistente retorna ok(null)', async () => {
      const missing = Email.parse('ghost@example.com');
      if (!missing.ok) throw new Error('fixture');
      const found = await reader.findByEmail(missing.value);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value, null);
      await cleanup();
    });

    it('CA5: save de mesmo id faz upsert (status atualizado)', async () => {
      const user = buildActive('upsert@example.com');
      await repository.save(user);
      const { user: disabled } = User.disable(user, AT);
      await repository.save(disabled);

      const found = await reader.findById(user.id);
      assert.equal(found.ok, true);
      if (found.ok) assert.equal(found.value?.status, 'disabled');
      await cleanup();
    });
  });
};
