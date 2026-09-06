import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as NsaSequence from '#src/modules/financial/domain/cedente/nsa-sequence.ts';
import * as Nsa from '#src/modules/financial/domain/cedente/nsa.ts';

/**
 * A sequência de NSA pertence ao CONVÊNIO, não à conta-cedente (#943).
 *
 * O que estes casos protegem é a propriedade que o defeito violava: um contrato multipag, uma
 * sequência — quantas contas de pagamento existam sob ele. Enquanto o contador viveu na conta, cada
 * conta nova nascia em 1 e duas contas irmãs emitiam o mesmo número sob o mesmo contrato.
 */
describe('nsa-sequence — o contador do convênio (#943)', () => {
  it('consome o número corrente e aponta para o próximo', () => {
    const r = NsaSequence.allocate({ convenio: '123456', nextNsa: 7 });

    assert.ok(isOk(r));
    assert.equal(r.value.nsa, 7);
    assert.equal(r.value.sequence.nextNsa, 8, 'a sequência tem de avançar');
    assert.equal(r.value.sequence.convenio, '123456', 'o dono da sequência não muda');
  });

  it('chamadas sucessivas nunca repetem o número', () => {
    let sequence = NsaSequence.start('123456');
    const emitted: number[] = [];

    for (let i = 0; i < 5; i += 1) {
      const r = NsaSequence.allocate(sequence);
      assert.ok(isOk(r));
      emitted.push(r.value.nsa);
      sequence = r.value.sequence;
    }

    assert.deepEqual(emitted, [1, 2, 3, 4, 5]);
    assert.equal(
      new Set(emitted).size,
      emitted.length,
      'NSA repetido é retransmissão para o banco',
    );
  });

  // ⚠️ CA2 — sequências de convênios distintos não se conhecem. É a metade que impede a correção de
  // virar um contador global: o cliente PODE ter contas com convênios diferentes, e cada contrato
  // tem a sua série junto ao banco.
  it('CA2: convênios distintos caminham independentes', () => {
    const a = NsaSequence.allocate(NsaSequence.start('111111'));
    const b = NsaSequence.allocate(NsaSequence.start('222222'));

    assert.ok(isOk(a) && isOk(b));
    assert.equal(a.value.nsa, 1);
    assert.equal(b.value.nsa, 1, 'o número 1 de um contrato não gasta o 1 do outro');
  });

  // O último número da faixa é entregue normalmente; só a alocação SEGUINTE falha. Recusar por
  // antecipação negaria uma remessa legítima.
  it('entrega o último número da faixa, e só então esgota', () => {
    const last = NsaSequence.allocate({ convenio: '123456', nextNsa: Nsa.MAX });
    assert.ok(isOk(last));
    assert.equal(last.value.nsa, Nsa.MAX);

    const beyond = NsaSequence.allocate(last.value.sequence);
    assert.ok(isErr(beyond));
    assert.equal(beyond.error, 'nsa-exhausted');
  });

  // ⚠️ `start` é SÓ para convênio genuinamente novo. Este caso fixa o valor porque o backfill da
  // migration depende dele: quem já emitiu nasce do `MAX`, nunca daqui.
  it('convênio novo nasce no mínimo da faixa', () => {
    assert.equal(NsaSequence.start('123456').nextNsa, Nsa.MIN);
  });
});
