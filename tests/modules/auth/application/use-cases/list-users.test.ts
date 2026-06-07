/**
 * W0 (RED) - Tests para o use case listUsers (modulo auth, US1 da spec 005).
 *
 * Ticket: AUTH-USECASE-LIST-USERS.
 *
 * Cobre CA1..CA6 do 000-request:
 *   - CA1: entrada valida delega ao port com params normalizados e retorna o PagedUsers do port
 *   - CA2: pageSize fora de {5,10,25} -> err('invalid-page-size')
 *   - CA3: page < 1 -> err('invalid-page')
 *   - CA4: defaults (input vazio) -> page=1, pageSize=5, status='all'
 *   - CA5: search trimado; vazio vira ausencia de busca
 *   - CA6: erro do port propaga
 *
 * DEVEM FALHAR em W0 - list-users.ts e user-query.ts ainda nao existem. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { listUsers } from '#src/modules/auth/application/use-cases/list-users.ts';
import type {
  UserQuery,
  ListUsersQuery,
  PagedUsers,
  UserQueryError,
} from '#src/modules/auth/application/ports/user-query.ts';

const PAGE: PagedUsers = {
  items: [{ id: 'u1', name: 'Amanda Manoel', email: 'amanda@x.com', status: 'active' }],
  meta: { currentPage: 1, pageSize: 5, totalItems: 1, totalPages: 1 },
};

const makeFakeQuery = (result: Result<PagedUsers, UserQueryError> = ok(PAGE)) => {
  const calls: ListUsersQuery[] = [];
  const userQuery: UserQuery = {
    list: (q: ListUsersQuery): Promise<Result<PagedUsers, UserQueryError>> => {
      calls.push(q);
      return Promise.resolve(result);
    },
  };
  return { userQuery, calls };
};

describe('listUsers', () => {
  it('CA1: entrada valida delega ao port e retorna o PagedUsers', async () => {
    const { userQuery, calls } = makeFakeQuery();

    const r = await listUsers({ userQuery })({
      page: 2,
      pageSize: 10,
      search: 'ama',
      status: 'active',
    });

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.deepEqual(r.value, PAGE);
    }
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], { page: 2, pageSize: 10, search: 'ama', status: 'active' });
  });

  it('CA2: pageSize invalido retorna err invalid-page-size', async () => {
    const { userQuery, calls } = makeFakeQuery();

    const r = await listUsers({ userQuery })({ pageSize: 7 });

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'invalid-page-size');
    }
    assert.equal(calls.length, 0); // nao chega ao port
  });

  it('CA3: page < 1 retorna err invalid-page', async () => {
    const { userQuery } = makeFakeQuery();

    const r = await listUsers({ userQuery })({ page: 0 });

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'invalid-page');
    }
  });

  it('CA4: defaults - input vazio normaliza para page=1 pageSize=5 status=all', async () => {
    const { userQuery, calls } = makeFakeQuery();

    await listUsers({ userQuery })({});

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.page, 1);
    assert.equal(calls[0]?.pageSize, 5);
    assert.equal(calls[0]?.status, 'all');
  });

  it('CA5: search e trimado; vazio vira ausencia de busca', async () => {
    const { userQuery, calls } = makeFakeQuery();

    await listUsers({ userQuery })({ search: '  ana  ' });
    assert.equal(calls[0]?.search, 'ana');

    await listUsers({ userQuery })({ search: '   ' });
    assert.equal(calls[1]?.search, undefined);
  });

  it('CA6: erro do port propaga', async () => {
    const { userQuery } = makeFakeQuery(err('user-query-unavailable'));

    const r = await listUsers({ userQuery })({});

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'user-query-unavailable');
    }
  });
});
