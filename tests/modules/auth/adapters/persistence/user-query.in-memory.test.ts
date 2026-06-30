/**
 * W0 (RED) - Tests para o adapter in-memory de UserQuery (modulo auth, US1 da spec 005).
 *
 * Ticket: AUTH-USECASE-LIST-USERS. Exercita paginacao/busca/filtro/ordenacao reais da projecao.
 *
 * DEVEM FALHAR em W0 - user-query.in-memory.ts ainda nao existe. ASCII puro.
 */

import { describe, it, before } from 'node:test';
import { strict as assert } from 'node:assert';

import * as User from '#src/modules/auth/domain/identity/user/user.ts';
import * as UserId from '#src/modules/auth/domain/identity/user-id.ts';
import * as Email from '#src/modules/auth/domain/identity/email.ts';
import * as PasswordHash from '#src/modules/auth/domain/credential/password-hash.ts';
import { inMemoryUserQuery } from '#src/modules/auth/adapters/persistence/repos/user-query.in-memory.ts';

const AT = new Date('2026-06-07T12:00:00.000Z');

const mkUser = (name: string, email: string, disabled = false): User.User => {
  const e = Email.parse(email);
  const h = PasswordHash.fromString('$argon2id$x');
  if (!e.ok || !h.ok) throw new Error('setup');
  let user: User.User = User.register(
    { id: UserId.generate(), email: e.value, passwordHash: h.value, roles: [] },
    AT,
  ).user;
  user = User.updateProfile(user, { name }, AT).user;
  if (disabled) user = User.disable(user as User.ActiveUser, AT).user;
  return user;
};

let users: readonly User.User[] = [];

before(() => {
  users = [
    mkUser('Amanda Manoel', 'amanda@x.com'),
    mkUser('Bruno Costa', 'bruno@x.com'),
    mkUser('Carla Dias', 'carla@x.com', true),
    mkUser('Daniel Eira', 'daniel@x.com'),
    mkUser('Amanda Silva', 'amanda2@x.com'),
  ];
});

describe('inMemoryUserQuery', () => {
  it('CA1: pagina (pageSize) e retorna meta coerente', async () => {
    const r = await inMemoryUserQuery(() => users).list({
      page: 1,
      pageSize: 5,
      status: 'all',
    });

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.items.length, 5);
      assert.deepEqual(r.value.meta, {
        currentPage: 1,
        pageSize: 5,
        totalItems: 5,
        totalPages: 1,
      });
    }
  });

  it('CA1: segunda pagina com pageSize 2', async () => {
    const r = await inMemoryUserQuery(() => users).list({ page: 2, pageSize: 2, status: 'all' });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.items.length, 2);
      assert.equal(r.value.meta.totalPages, 3);
      assert.equal(r.value.meta.currentPage, 2);
    }
  });

  it('busca parcial case-insensitive por nome', async () => {
    const r = await inMemoryUserQuery(() => users).list({
      page: 1,
      pageSize: 25,
      status: 'all',
      search: 'amanda',
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.items.length, 2); // Amanda Manoel + Amanda Silva
    }
  });

  it('filtro por status disabled', async () => {
    const r = await inMemoryUserQuery(() => users).list({
      page: 1,
      pageSize: 25,
      status: 'disabled',
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.items.length, 1);
      assert.equal(r.value.items[0]?.name, 'Carla Dias');
      assert.equal(r.value.items[0]?.status, 'disabled');
    }
  });

  it('ordenacao alfabetica por nome', async () => {
    const r = await inMemoryUserQuery(() => users).list({ page: 1, pageSize: 25, status: 'all' });
    assert.equal(r.ok, true);
    if (r.ok) {
      const names = r.value.items.map((i) => i.name);
      assert.deepEqual(names, [
        'Amanda Manoel',
        'Amanda Silva',
        'Bruno Costa',
        'Carla Dias',
        'Daniel Eira',
      ]);
    }
  });

  it('busca sem correspondencia retorna vazio com meta coerente', async () => {
    const r = await inMemoryUserQuery(() => users).list({
      page: 1,
      pageSize: 5,
      status: 'all',
      search: 'zzz-nao-existe',
    });
    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value.items.length, 0);
      assert.equal(r.value.meta.totalItems, 0);
    }
  });
});
