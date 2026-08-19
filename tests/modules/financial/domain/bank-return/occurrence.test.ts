// As ocorrências do retorno (G059) — o campo que diz o desfecho de um pagamento (#690).
//
// Os casos aqui são de FORMA (como se lê o campo) e de PRECEDÊNCIA (o que o conjunto significa).
// Nenhum deles depende de arquivo, banco ou remessa: é a decisão pura sobre dez caracteres.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  MAX_OCCURRENCES,
  classifyOccurrence,
  classifyOccurrences,
  splitOccurrences,
} from '#src/modules/financial/domain/bank-return/occurrence.ts';

describe('splitOccurrences — dez posições, até cinco códigos', () => {
  it('lê uma ocorrência sozinha, com o preenchimento à direita do layout', () => {
    // O campo é `Alfa`: um registro com um código traz `00` + oito brancos.
    assert.deepEqual(splitOccurrences('00        '), ['00']);
  });

  it('lê várias ocorrências no mesmo campo — o caso que o parser ingênuo perde', () => {
    assert.deepEqual(splitOccurrences('ABCDEF    '), ['AB', 'CD', 'EF']);
  });

  it('preserva a ORDEM em que o banco listou', () => {
    // O banco lista da mais relevante para a menos, e o laudo é lido nessa ordem.
    assert.deepEqual(splitOccurrences('BBAA      '), ['BB', 'AA']);
  });

  it('campo em branco não produz ocorrência nenhuma', () => {
    assert.deepEqual(splitOccurrences('          '), []);
    assert.deepEqual(splitOccurrences(''), []);
  });

  it('nunca devolve mais que o teto do campo', () => {
    // Dez posições ⇒ cinco códigos. Um campo maior que isso é defeito do produtor, e aproveitar o
    // excedente seria ler posição que pertence a outro campo.
    const excedente = 'AABBCCDDEEFF';
    assert.equal(splitOccurrences(excedente).length, MAX_OCCURRENCES);
  });

  it('normaliza a caixa — `ab` e `AB` são o mesmo código', () => {
    assert.deepEqual(splitOccurrences('ab        '), ['AB']);
  });
});

describe('classifyOccurrence — o desfecho de um código', () => {
  it('`00` e `03` são liquidação: caminhos diferentes, mesmo resultado', () => {
    assert.equal(classifyOccurrence('00'), 'settled');
    assert.equal(classifyOccurrence('03'), 'settled');
  });

  it('`01` é recusa e `02` é cancelamento — não se confundem', () => {
    // Insuficiência de fundos pede nova tentativa; cancelamento pelo pagador, não.
    assert.equal(classifyOccurrence('01'), 'rejected');
    assert.equal(classifyOccurrence('02'), 'cancelled');
  });

  it('as quatro famílias de letra são rejeição, qualquer que seja o escopo', () => {
    // A* registro · B* favorecido/pagamento · C* código de barras · H* lote ou arquivo.
    for (const code of ['AA', 'AF', 'BB', 'BQ', 'CA', 'CP', 'HA', 'HJ']) {
      assert.equal(classifyOccurrence(code), 'rejected', code);
    }
  });

  it('código fora do catálogo é `unknown`, NUNCA liquidado por omissão', () => {
    // É a mesma disciplina do parser do `status/`: valor novo que o banco passe a publicar exige
    // decisão nossa, e silenciá-lo esconderia a mudança de contrato.
    for (const code of ['ZZ', '99', 'D1', '  ']) {
      assert.equal(classifyOccurrence(code), 'unknown', code);
    }
  });
});

describe('classifyOccurrences — a precedência, escolhida pelo custo do erro', () => {
  it('campo VAZIO é desconhecido, nunca liquidado', () => {
    // Ausência de ocorrência é silêncio, não confirmação. Ler silêncio como sucesso é como sistemas
    // pagam duas vezes.
    assert.equal(classifyOccurrences([]), 'unknown');
  });

  it('uma liquidação sozinha é liquidação', () => {
    assert.equal(classifyOccurrences(['00']), 'settled');
  });

  it('rejeição ao lado de liquidação vence — a recusa é a informação nova', () => {
    assert.equal(classifyOccurrences(['00', 'AF']), 'rejected');
    assert.equal(classifyOccurrences(['AF', '00']), 'rejected', 'a ordem não muda o veredito');
  });

  it('cancelamento vence liquidação', () => {
    assert.equal(classifyOccurrences(['00', '02']), 'cancelled');
  });

  it('DESCONHECIDO vence tudo, inclusive uma liquidação explícita', () => {
    // O caso que decide a regra: `00` + código que não conhecemos. O desconhecido pode ser a
    // ressalva que muda o sentido, e marcar como pago um título que não foi é o erro caro.
    // Preferimos parar alguém para olhar.
    assert.equal(classifyOccurrences(['00', 'ZZ']), 'unknown');
    assert.equal(classifyOccurrences(['ZZ', 'AF']), 'unknown');
  });
});
