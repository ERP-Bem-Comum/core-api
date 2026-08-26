import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  readVanSandboxAuth,
  extractBearerToken,
  tokenMatches,
  isAuthorized,
} from '#src/modules/financial/adapters/http/van-sandbox-auth.ts';

const STRONG = 'a'.repeat(32);

describe('exercício da VAN — fail-closed na leitura do token', () => {
  it('sem VAN_SANDBOX_TOKEN a rota não deve existir', () => {
    assert.equal(readVanSandboxAuth({}), undefined);
    assert.equal(readVanSandboxAuth({ VAN_SANDBOX_TOKEN: '' }), undefined);
  });

  it('token curto recusa em vez de proteger mal', () => {
    // Não é preciosismo: um token adivinhável passa a impressão de haver controle onde não há —
    // pior que a ausência, porque ninguém procura o que parece resolvido.
    assert.equal(readVanSandboxAuth({ VAN_SANDBOX_TOKEN: 'curto' }), undefined);
    assert.equal(readVanSandboxAuth({ VAN_SANDBOX_TOKEN: 'a'.repeat(31) }), undefined);
  });

  it('token forte habilita', () => {
    assert.deepEqual(readVanSandboxAuth({ VAN_SANDBOX_TOKEN: STRONG }), { token: STRONG });
  });
});

describe('exercício da VAN — extração do header', () => {
  it('aceita o esquema Bearer, sem depender da caixa', () => {
    assert.equal(extractBearerToken(`Bearer ${STRONG}`), STRONG);
    assert.equal(extractBearerToken(`bearer ${STRONG}`), STRONG);
  });

  it('recusa header ausente, vazio ou de outro esquema', () => {
    assert.equal(extractBearerToken(undefined), undefined);
    assert.equal(extractBearerToken(''), undefined);
    assert.equal(extractBearerToken(STRONG), undefined);
    assert.equal(extractBearerToken(`Basic ${STRONG}`), undefined);
    assert.equal(extractBearerToken('Bearer '), undefined);
  });
});

describe('exercício da VAN — comparação do token', () => {
  it('reconhece o token correto e recusa o errado', () => {
    assert.equal(tokenMatches(STRONG, STRONG), true);
    assert.equal(tokenMatches('b'.repeat(32), STRONG), false);
  });

  // A razão de comparar DIGESTS e não os bytes crus. `timingSafeEqual` lança `RangeError` quando os
  // comprimentos diferem, então a versão ingênua precisa de um `if (a.length !== b.length)` antes —
  // e esse `if` é um oráculo: responde mais rápido para tamanho errado, e quem tenta descobre o
  // comprimento do segredo. Digest tem sempre 32 bytes: não lança, e o tamanho não vaza.
  it('não lança quando os comprimentos diferem', () => {
    assert.doesNotThrow(() => tokenMatches('a', STRONG));
    assert.doesNotThrow(() => tokenMatches('a'.repeat(500), STRONG));
    assert.equal(tokenMatches('a', STRONG), false);
  });

  it('isAuthorized junta as duas metades', () => {
    assert.equal(isAuthorized(`Bearer ${STRONG}`, STRONG), true);
    assert.equal(isAuthorized(`Bearer ${'b'.repeat(32)}`, STRONG), false);
    assert.equal(isAuthorized(undefined, STRONG), false);
  });
});
