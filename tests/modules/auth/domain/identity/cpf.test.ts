/**
 * W0 (RED) - Tests para Cpf (branded type + smart constructor) do modulo auth.
 *
 * Ticket: AUTH-USER-VO-CPF (spec 005-gestao-usuarios, Foundational).
 *
 * Cobre CA1..CA6 do 000-request:
 *   - CA1: CPF valido (com ou sem mascara) retorna ok, normalizado para 11 digitos
 *   - CA2: vazio / so espacos / sem digitos retorna err('cpf-empty')
 *   - CA3: quantidade de digitos != 11 retorna err('cpf-invalid-length')
 *   - CA4: digitos verificadores invalidos retorna err('cpf-invalid-checksum')
 *   - CA5: sequencia de digitos repetidos retorna err('cpf-invalid-checksum')
 *   - CA6: branded - parse nunca lanca, sempre retorna Result (sem throw/class)
 *
 * Estes tests DEVEM FALHAR em W0 - src/modules/auth/domain/identity/cpf.ts ainda nao existe.
 *
 * CPF de referencia: 52998224725 (digitos verificadores validos), com mascara "529.982.247-25".
 * ASCII puro (precaucao Node 24 strip-types).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Cpf from '#src/modules/auth/domain/identity/cpf.ts';

describe('Cpf.parse', () => {
  it('CA1: CPF valido sem mascara retorna ok normalizado', () => {
    const r = Cpf.parse('52998224725');

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, '52998224725');
    }
  });

  it('CA1: CPF valido com mascara normaliza para 11 digitos', () => {
    const r = Cpf.parse('529.982.247-25');

    assert.equal(r.ok, true);
    if (r.ok) {
      assert.equal(r.value, '52998224725');
    }
  });

  it('CA2: string vazia retorna err cpf-empty', () => {
    const r = Cpf.parse('');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'cpf-empty');
    }
  });

  it('CA2: so espacos / sem digitos retorna err cpf-empty', () => {
    const r = Cpf.parse('   ');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'cpf-empty');
    }
  });

  it('CA3: menos de 11 digitos retorna err cpf-invalid-length', () => {
    const r = Cpf.parse('123');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'cpf-invalid-length');
    }
  });

  it('CA3: mais de 11 digitos retorna err cpf-invalid-length', () => {
    const r = Cpf.parse('529982247250');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'cpf-invalid-length');
    }
  });

  it('CA4: digitos verificadores invalidos retorna err cpf-invalid-checksum', () => {
    // ultimo digito trocado (5 -> 6)
    const r = Cpf.parse('52998224726');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'cpf-invalid-checksum');
    }
  });

  it('CA5: sequencia de digitos repetidos retorna err cpf-invalid-checksum', () => {
    const r = Cpf.parse('11111111111');

    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.error, 'cpf-invalid-checksum');
    }
  });

  it('CA6: parse nunca lanca - sempre retorna Result', () => {
    // entradas hostis nao devem lancar
    assert.doesNotThrow(() => Cpf.parse('abc.def.ghi-jk'));
    assert.doesNotThrow(() => Cpf.parse('!@#$%'));

    const r = Cpf.parse('not-a-cpf');
    assert.equal(typeof r.ok, 'boolean');
  });
});
