import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { payeeIspbFor } from '#src/modules/financial/adapters/cnab/payee-ispb.ts';
import { ISPB_BY_BANK_CODE } from '#src/modules/financial/adapters/cnab/ispb-by-bank-code.generated.ts';

/*
 * ⚠️ NENHUM PAR (banco, ISPB) LITERAL NESTE ARQUIVO, e a omissão é deliberada.
 *
 * O ISPB de instituição é dado público do Bacen — o que não pode viver num repositório público é
 * dado de CADASTRO, e um assert do tipo `payeeIspbFor('237') === '60746948'` convidaria o próximo
 * teste a escrever o par do favorecido junto. Pior: ele testaria o CONTEÚDO da fonte, que muda quando
 * o Bacen republica, em vez da PROPRIEDADE da função, que não muda. Um teste que quebra ao atualizar
 * a tabela treina quem o vê a atualizar o assert sem pensar.
 *
 * Os casos abaixo comparam contra o próprio mapa gerado, ou afirmam forma — nunca valor decorado.
 */

describe('payeeIspbFor — o ISPB do favorecido vem do código de compensação (#923)', () => {
  it('devolve o ISPB de um banco presente na tabela', () => {
    // Pega a primeira entrada do mapa em vez de fixar um banco: o teste continua valendo quando a
    // fonte for republicada, e continua falhando se a função parar de consultar a tabela.
    const [bankCode, expected] = Object.entries(ISPB_BY_BANK_CODE)[0] ?? [];
    assert.ok(bankCode !== undefined && expected !== undefined, 'mapa gerado está vazio');

    const r = payeeIspbFor(bankCode);
    assert.ok(isOk(r), 'banco presente na tabela deve resolver');
    assert.equal(r.value, expected);
  });

  it('todo ISPB do mapa tem exatamente 8 dígitos — é o que o P015 exige', () => {
    // A propriedade que o layout cobra, medida sobre a tabela inteira. Uma entrada de 7 posições
    // passaria pela função e só apareceria como recusa do banco, depois de transmitida.
    const malformed = Object.entries(ISPB_BY_BANK_CODE)
      .filter(([, ispb]) => !/^\d{8}$/.test(ispb))
      .map(([code]) => code);
    assert.deepEqual(malformed, []);
  });

  it('toda chave do mapa tem exatamente 3 dígitos', () => {
    const malformed = Object.keys(ISPB_BY_BANK_CODE).filter((code) => !/^\d{3}$/.test(code));
    assert.deepEqual(malformed, []);
  });

  it('a tabela cobre o universo que o Bacen publica, não um recorte', () => {
    // ⚠️ Guarda contra o defeito que quase entrou: filtrar por `Participa_da_Compe = Sim` deixaria
    // apenas 95 das 348 instituições — e Nubank e C6 estão entre as 253 que ficariam de fora, sendo
    // favorecidos correntes. O número redondo denuncia o recorte; a ordem de grandeza, não.
    assert.ok(
      Object.keys(ISPB_BY_BANK_CODE).length > 300,
      `mapa com ${String(Object.keys(ISPB_BY_BANK_CODE).length)} entradas — recorte da fonte?`,
    );
  });

  // ── O caminho de erro, que é o que impede pagamento para o destino errado ──────────────────────

  it('recusa banco que não está na tabela, em vez de inventar', () => {
    // `999` não é participante. O que NÃO pode acontecer é devolver zeros, brancos ou o próprio
    // código zero-padded: os três produzem arquivo bem-formado que o banco recusa, e o inspetor não
    // pega porque não é defeito de forma.
    const r = payeeIspbFor('999');
    assert.equal(isOk(r), false);
    assert.equal(isOk(r) ? null : r.error, 'payee-ispb-unknown');
  });

  it('recusa entrada malformada — vazia, curta, longa ou não numérica', () => {
    for (const bad of ['', '1', '00', '0001', '23a', '   ', '237 ']) {
      const r = payeeIspbFor(bad);
      assert.equal(isOk(r), false, `deveria recusar ${JSON.stringify(bad)}`);
    }
  });

  it('não resolve por prefixo nem por coerção — a chave é exata', () => {
    // Um `Record<string, string>` aceita qualquer string; sem a guarda de forma, `'toString'` e
    // `'constructor'` alcançariam o protótipo e devolveriam uma função como se fosse ISPB.
    for (const attack of ['toString', 'constructor', '__proto__', 'valueOf']) {
      const r = payeeIspbFor(attack);
      assert.equal(isOk(r), false, `deveria recusar ${attack}`);
    }
  });
});
