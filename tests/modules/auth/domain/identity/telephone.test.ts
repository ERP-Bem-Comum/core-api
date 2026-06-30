/**
 * W0 (RED) - Tests para Telephone (branded type + smart constructor) do modulo auth.
 *
 * Ticket: AUTH-USER-VO-TELEPHONE (spec 005-gestao-usuarios, Foundational).
 *
 * Cobre CA1..CA8 do 000-request:
 *   - CA1: celular valido com mascara normaliza para 11 digitos
 *   - CA2: celular valido sem mascara (11 digitos, 3o = 9) retorna ok
 *   - CA3: fixo valido (10 digitos) retorna ok
 *   - CA4: vazio / so espacos / sem digitos retorna err('telephone-empty')
 *   - CA5: quantidade de digitos != 10 e != 11 retorna err('telephone-invalid')
 *   - CA6: DDD invalido (comeca com 0) retorna err('telephone-invalid')
 *   - CA7: celular (11 digitos) sem o 9 inicial retorna err('telephone-invalid')
 *   - CA8: parse nunca lanca, sempre retorna Result
 *
 * Estes tests DEVEM FALHAR em W0 - src/modules/auth/domain/identity/telephone.ts ainda nao existe.
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Telephone from '#src/modules/auth/domain/identity/telephone.ts';

describe('Telephone.parse', () => {
  it('CA1: celular valido com mascara normaliza para 11 digitos', () => {
    const r = Telephone.parse('(15)99713-3502');

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, '15997133502');
    }
  });

  it('CA2: celular valido sem mascara retorna ok', () => {
    const r = Telephone.parse('15997133502');

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, '15997133502');
    }
  });

  it('CA3: fixo valido (10 digitos) retorna ok', () => {
    const r = Telephone.parse('1533334444');

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, '1533334444');
    }
  });

  it('CA4: string vazia retorna err telephone-empty', () => {
    const r = Telephone.parse('');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'telephone-empty');
    }
  });

  it('CA4: so espacos retorna err telephone-empty', () => {
    const r = Telephone.parse('   ');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'telephone-empty');
    }
  });

  it('CA5: quantidade de digitos invalida retorna err telephone-invalid', () => {
    const r = Telephone.parse('123456');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'telephone-invalid');
    }
  });

  it('CA6: DDD invalido (comeca com 0) retorna err telephone-invalid', () => {
    const r = Telephone.parse('0999713350');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'telephone-invalid');
    }
  });

  it('CA7: celular sem o 9 inicial retorna err telephone-invalid', () => {
    // 11 digitos, DDD 15, mas 3o digito = 8 (nao 9)
    const r = Telephone.parse('15897133502');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'telephone-invalid');
    }
  });

  it('CA8: parse nunca lanca - sempre retorna Result', () => {
    assert.doesNotThrow(() => Telephone.parse('abc-def'));
    assert.doesNotThrow(() => Telephone.parse('!@#'));

    const r = Telephone.parse('not-a-phone');
    assert.equal(typeof r.ok, 'boolean');
  });
});
