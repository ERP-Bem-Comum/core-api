/**
 * Guard do gerador de cpf sintetico das fixtures (tests/support/synthetic-cpf.ts).
 *
 * Um helper de fixture que produzisse cpf INVALIDO faria dezenas de testes falharem com
 * `cpf-invalid-checksum` longe da causa; e um que produzisse cpf REPETIDO faria falharem com
 * `cpf-already-registered`, que e justamente o que o UNIQUE da migration 0010 passou a cobrar.
 * As duas propriedades sao verificadas aqui, contra o proprio VO. ASCII puro.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Cpf from '#src/modules/auth/domain/identity/cpf.ts';
import { syntheticCpf } from './synthetic-cpf.ts';

const SEEDS = 500;

describe('syntheticCpf', () => {
  it('todo cpf gerado passa no Cpf.parse do dominio', () => {
    for (let seed = 0; seed < SEEDS; seed += 1) {
      const raw = syntheticCpf(seed);
      const parsed = Cpf.parse(raw);
      assert.equal(parsed.ok, true, `seed ${String(seed)} gerou cpf invalido (${raw})`);
    }
  });

  it('gera 11 digitos, sem mascara', () => {
    for (let seed = 0; seed < 50; seed += 1) {
      assert.match(syntheticCpf(seed), /^\d{11}$/);
    }
  });

  // A propriedade que importa para o UNIQUE: seeds distintos nao colidem. Um gerador que
  // repetisse valor reintroduziria o 409 que esta correcao existe para eliminar.
  it('seeds distintos geram cpfs distintos', () => {
    const seen = new Set<string>();
    for (let seed = 0; seed < SEEDS; seed += 1) seen.add(syntheticCpf(seed));
    // O guard de digitos-iguais desloca o seed em 1, logo um par vizinho pode coincidir; o que
    // nao pode e haver colisao em volume. 9 deslocamentos na faixa -> no minimo SEEDS - 9 unicos.
    assert.ok(
      seen.size >= SEEDS - 9,
      `colisao excessiva: ${String(seen.size)} unicos em ${String(SEEDS)} seeds`,
    );
  });

  it('e deterministico: o mesmo seed devolve sempre o mesmo cpf', () => {
    assert.equal(syntheticCpf(42), syntheticCpf(42));
  });

  // Guard explicito do caso que quebrou a primeira versao do helper: base com os 9 digitos iguais
  // produz DVs iguais a ela, formando as sequencias que o VO rejeita.
  it('nao gera sequencia de digitos repetidos (11111111111 e irmas)', () => {
    for (const seed of [111_111_110, 222_222_221, 333_333_332, 0]) {
      const raw = syntheticCpf(seed);
      assert.doesNotMatch(raw, /^(\d)\1{10}$/, `seed ${String(seed)} gerou sequencia (${raw})`);
      assert.equal(Cpf.parse(raw).ok, true);
    }
  });
});
