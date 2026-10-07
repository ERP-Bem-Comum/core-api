/**
 * #1029 — `makeAuthUserNameReader`: o nome do autor degrada para `null` em toda falha, sem segurar
 * o PUT (a leitura roda depois do save).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { ok, err } from '#src/shared/index.ts';
import { makeAuthUserNameReader } from '#src/modules/partners/adapters/read/user-name-reader.auth.ts';
import type { AuthUserReadPort } from '#src/modules/auth/public-api/read.ts';

const portReturning = (name: string | null): AuthUserReadPort => ({
  getUserName: (id) => Promise.resolve(ok({ id, name })),
});

describe('makeAuthUserNameReader (#1029)', () => {
  it('devolve o nome aparado', async () => {
    assert.equal(await makeAuthUserNameReader(portReturning('  Ana  ')).getUserName('u1'), 'Ana');
  });

  it('nome nulo ou vazio → null (uma só representação de "sem nome")', async () => {
    assert.equal(await makeAuthUserNameReader(portReturning(null)).getUserName('u1'), null);
    assert.equal(await makeAuthUserNameReader(portReturning('   ')).getUserName('u1'), null);
  });

  it('usuário inexistente, erro do auth ou port ausente → null', async () => {
    const missing: AuthUserReadPort = { getUserName: () => Promise.resolve(ok(null)) };
    const failing: AuthUserReadPort = {
      getUserName: () => Promise.resolve(err('auth-user-read-unavailable' as const)),
    };
    assert.equal(await makeAuthUserNameReader(missing).getUserName('u1'), null);
    assert.equal(await makeAuthUserNameReader(failing).getUserName('u1'), null);
    assert.equal(await makeAuthUserNameReader(null).getUserName('u1'), null);
  });

  it('auth que não responde → null no timeout, sem pendurar', async () => {
    const hanging: AuthUserReadPort = { getUserName: () => new Promise(() => undefined) };
    const started = Date.now();
    const name = await makeAuthUserNameReader(hanging, { timeoutMs: 20 }).getUserName('u1');
    assert.equal(name, null);
    assert.ok(Date.now() - started < 1_000, 'timeout não disparou');
  });
});
