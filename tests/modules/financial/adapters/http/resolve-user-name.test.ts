/**
 * FIN-RECON-EXECUTOR-NAME (#207) — CA5 (parte unit): degradação graciosa do `resolveUserName`.
 *
 * `resolveUserName` é o helper de composição síncrona (ADR-0032) que a borda usa para resolver o
 * nome de um usuário a partir do `AuthUserReadPort`. Deve devolver `null` (NUNCA throw / 5xx) quando:
 *   - o port é nulo (não injetado);
 *   - o id é nulo;
 *   - o usuário não existe (port → ok(null));
 *   - o usuário existe mas o nome é nulo;
 *   - o port falha (err);
 * e o NOME quando o usuário existe com nome.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/primitives/result.ts';
import { resolveUserName } from '#src/modules/financial/adapters/http/user-name-composition.ts';
import type { AuthUserReadPort } from '#src/modules/auth/public-api/read.ts';

const USER_ID = '99999999-9999-4999-8999-999999999999';

const portReturning = (name: string | null): AuthUserReadPort => ({
  getUserName: (id: string) => Promise.resolve(ok({ id, name })),
});
const portNotFound: AuthUserReadPort = {
  getUserName: () => Promise.resolve(ok(null)),
};
const portFailing: AuthUserReadPort = {
  getUserName: () => Promise.resolve(err('auth-user-read-unavailable')),
};

describe('financial/http — resolveUserName (ADR-0032, degradação graciosa)', () => {
  it('usuário com nome → devolve o nome', async () => {
    const name = await resolveUserName(portReturning('Maria Operadora'), USER_ID);
    assert.equal(name, 'Maria Operadora');
  });

  it('usuário existe com nome nulo → null', async () => {
    const name = await resolveUserName(portReturning(null), USER_ID);
    assert.equal(name, null);
  });

  it('usuário inexistente (port → ok(null)) → null', async () => {
    const name = await resolveUserName(portNotFound, USER_ID);
    assert.equal(name, null);
  });

  it('port falha (err) → null (sem throw)', async () => {
    const name = await resolveUserName(portFailing, USER_ID);
    assert.equal(name, null);
  });

  it('port nulo → null', async () => {
    const name = await resolveUserName(null, USER_ID);
    assert.equal(name, null);
  });

  it('id nulo → null (sem chamar o port)', async () => {
    let called = false;
    const spyPort: AuthUserReadPort = {
      getUserName: (id: string) => {
        called = true;
        return Promise.resolve(ok({ id, name: 'X' }));
      },
    };
    const name = await resolveUserName(spyPort, null);
    assert.equal(name, null);
    assert.equal(called, false);
  });
});
