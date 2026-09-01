import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { segmentJ52 } from '#src/modules/financial/adapters/cnab/multipag-segments.ts';

/**
 * Segmento J-52 — identificação do Sacado, do Cedente e do Sacador Avalista.
 *
 * Fonte primária: `jun-19-layout-multipag.pdf` p. 33 (local-only), campos 01.4.J52 a 18.4.J52. O
 * cabeçalho da página é literal: *"Obrigatório para pagamentos de títulos de Cobrança independente
 * do valor com transferência para o Cedente"*.
 *
 * ⚠️ EXISTEM DOIS SEGMENTOS J-52 NO MANUAL, iguais até a posição 131 e divergentes daí em diante.
 * Este é o de COBRANÇA (p. 33), que gasta 132-187 no Sacador Avalista. O da seção de PIX (p. 42) usa
 * 132-210 para a chave de endereçamento (`G102`) e 211-240 para o TXID do QR-Code, e pertence à
 * forma `47`. Um fatiador configurado com o layout de Pix lê o bloco do sacador zerado como se fosse
 * chave — foi por isso que este arquivo declara as posições por extenso em vez de conferir por
 * comprimento.
 *
 * A forma é conferida contra o golden do banco (`GOLDEN_TEST_MULTIPAG_TED_TRANSFERENCIA_BOLETO`,
 * lote 3, forma `31`, layout `040`), que é norma sobre a FORMA. Os VALORES aqui são sintéticos: os
 * repositórios são públicos, e fixture é o caminho por onde dado real de cadastro entra.
 */

const SACADO = {
  documentType: '2' as const,
  document: '12345678000199',
  name: 'ASSOCIACAO BEM COMUM',
};

const CEDENTE = {
  documentType: '2' as const,
  document: '98765432000111',
  name: 'FORNECEDOR EXEMPLO LTDA',
};

const BASE = {
  bankCode: '237',
  batchNumber: 3,
  recordNumber: 2,
  payer: SACADO,
  beneficiary: CEDENTE,
};

const line = (r: ReturnType<typeof segmentJ52>): string => {
  assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
  return r.value;
};

// Posições do layout são 1-based e inclusivas nas duas pontas.
const at = (s: string, from: number, to: number): string => s.slice(from - 1, to);

describe('Multipag — Segmento J-52 (identificação do sacado e do cedente)', () => {
  const record = line(segmentJ52(BASE));

  it('tem exatamente 240 posições', () => {
    assert.equal(record.length, 240);
  });

  it('identifica-se como detalhe do lote, com o sequencial e a letra J', () => {
    assert.equal(at(record, 1, 3), '237');
    assert.equal(at(record, 4, 7), '0003');
    assert.equal(at(record, 8, 8), '3');
    assert.equal(at(record, 9, 13), '00002');
    // ⚠️ O J-52 grava 'J' na coluna 014 como o Segmento J. Não existe letra própria para ele: quem
    // os separa é o G067, abaixo.
    assert.equal(at(record, 14, 14), 'J');
  });

  it('declara-se registro opcional 52 no G067 (018-019)', () => {
    assert.equal(at(record, 18, 19), '52');
  });

  /*
   * As duas colunas em que a analogia com o Segmento J escreveria o valor errado.
   *
   * O J grava, nestas mesmas posições, `0` de tipo de movimento (`G060`) e `09` de instrução
   * (`G061`, "Inclusão do Registro Detalhe Bloqueado", decisão da P.O. na #805). No J-52 os campos
   * são OUTROS:
   *
   *   · 015 é `G004` "Uso Exclusivo FEBRABAN/CNAB", default Brancos no layout;
   *   · 016-017 é `*C004` "Código de Movimento Remessa" — dicionário de COBRANÇA, cujo domínio
   *     (manual p. 118) enumera **'09' = Protestar**.
   *
   * Propagar a política do #805 para cá emitiria arquivo bem-formado mandando PROTESTAR o título
   * que se está pagando, e nenhum inspetor de forma pegaria. O golden grava `00` — que sequer consta
   * do domínio, que começa em '01' — e a hierarquia resolve: golden vence tabela de layout.
   */
  it('não repete a instrução do Segmento J: 015 é branco e 016-017 é o C004 zerado', () => {
    assert.equal(at(record, 15, 15), ' ');
    assert.equal(at(record, 16, 17), '00');
  });

  it('grava o SACADO — quem paga — em 020-075', () => {
    assert.equal(at(record, 20, 20), '2');
    // Num alinha à direita com zeros à esquerda: 14 dígitos num campo de 15.
    assert.equal(at(record, 21, 35), '012345678000199');
    assert.equal(at(record, 36, 75), 'ASSOCIACAO BEM COMUM'.padEnd(40, ' '));
  });

  /*
   * ⚠️ O bloco do CEDENTE é o beneficiário, e o vocabulário colide de frente com o desta base: em
   * `CedenteHeaderData` "cedente" é a empresa que PAGA, e aqui essa mesma empresa é o SACADO. No
   * vocabulário de cobrança, cedente é quem emitiu o título e recebe — a mesma pessoa que o Segmento
   * J nomeia em 062-091.
   *
   * Trocar os dois blocos produz arquivo que o banco aceita declarando o pagador como beneficiário.
   */
  it('grava o CEDENTE — quem emitiu o título e recebe — em 076-131', () => {
    assert.equal(at(record, 76, 76), '2');
    assert.equal(at(record, 77, 91), '098765432000111');
    assert.equal(at(record, 92, 131), 'FORNECEDOR EXEMPLO LTDA'.padEnd(40, ' '));
  });

  /*
   * A regra que o golden ensina e a tabela de layout não enuncia: dentro do MESMO registro, campo
   * `Num` ausente sai ZERADO e campo `Alfa` ausente sai BRANCO.
   *
   * O reflexo natural — deixar o bloco inteiro em brancos, "porque não há sacador avalista" —
   * diverge do golden em 16 posições, e é divergência silenciosa: o comprimento fecha, o trailer
   * fecha, o inspetor aprova. O manual corrobora pelos asteriscos de obrigatoriedade: `*G005` e
   * `*G006` (Num) levam asterisco e saem zerados; `G013` (Alfa) não leva, e sai branco.
   */
  it('emite o SACADOR AVALISTA ausente ZERADO no Num e BRANCO no Alfa', () => {
    assert.equal(at(record, 132, 132), '0', 'tipo de inscrição é Num — zero, não branco');
    assert.equal(at(record, 133, 147), '0'.repeat(15), 'inscrição é Num — zeros, não brancos');
    assert.equal(at(record, 148, 187), ' '.repeat(40), 'nome é Alfa — brancos, não zeros');
  });

  it('fecha com 53 posições de CNAB em branco', () => {
    assert.equal(at(record, 188, 240), ' '.repeat(53));
  });

  /*
   * O contorno do registro, medido pela BORDA e não por contagem dentro de corrida homogênea.
   *
   * As posições 132-187 são 16 zeros seguidos de 40 brancos, e contar caractere ali dentro para
   * afirmar deslocamento não mede nada — é o falso positivo mais caro deste domínio. A testemunha
   * honesta é onde a classe de caractere MUDA: o último caractere do nome do cedente, o primeiro
   * zero do sacador, e a fronteira zero→branco em 147/148.
   */
  it('tem as fronteiras de classe de caractere onde o layout manda', () => {
    assert.equal(at(record, 131, 133), ' 00', 'fim do Alfa do cedente → início do Num do sacador');
    assert.equal(at(record, 147, 148), '0 ', 'fim do Num do sacador → início do Alfa do nome');
  });

  it('preenche o nome mais longo que o campo truncando, como o layout prevê', () => {
    const long = line(segmentJ52({ ...BASE, beneficiary: { ...CEDENTE, name: 'X'.repeat(60) } }));

    assert.equal(at(long, 92, 131), 'X'.repeat(40));
    // A truncagem não pode vazar para o campo seguinte: o registro continua com 240 posições e o
    // bloco do sacador segue no lugar.
    assert.equal(long.length, 240);
    assert.equal(at(long, 132, 147), '0'.repeat(16));
  });
});

/**
 * A guarda de identificação (#891, CA3) — defesa em profundidade, decisão do dono em 01/09/2026.
 *
 * ⚠️ ESTES CASOS CHAMAM `segmentJ52` NA UNHA, E É DELIBERADO. O caminho é inalcançável pela rota
 * completa: o reader recusa o título cujo favorecido não resolve antes mesmo de o NSA ser alocado.
 * Chegar aqui pela geração é impossível hoje — e é justamente por isso que o teste tem de existir.
 * Sem ele a guarda seria código morto sem cobertura, e o gate não acusaria.
 *
 * O que ela protege não é o chamador de hoje: é o de amanhã. `address?: PayeeAddress` mostrou como
 * esse defeito entra — o montador aceita input incompleto, emite brancos, e as duas metades
 * concordam sobre um arquivo que o layout recusa (#858).
 */
describe('Multipag — Segmento J-52 recusa registro que não identifica as partes', () => {
  const errorOf = (r: ReturnType<typeof segmentJ52>): string => {
    assert.ok(isErr(r), 'esperava erro, veio ok');
    return r.error;
  };

  it('recusa o cedente sem nome, em vez de emitir 40 brancos', () => {
    const r = segmentJ52({ ...BASE, beneficiary: { ...CEDENTE, name: '' } });
    assert.equal(errorOf(r), 'billet-party-unidentified');
  });

  it('recusa o sacado sem nome', () => {
    const r = segmentJ52({ ...BASE, payer: { ...SACADO, name: '' } });
    assert.equal(errorOf(r), 'billet-party-unidentified');
  });

  it('recusa nome que é só espaço em branco', () => {
    const r = segmentJ52({ ...BASE, beneficiary: { ...CEDENTE, name: '     ' } });
    assert.equal(errorOf(r), 'billet-party-unidentified');
  });

  /*
   * O caso que separa uma guarda honesta de uma ingênua, e vem da #862.
   *
   * `alpha()` transforma em BRANCO todo caractere sem transliteração legível — `€`, `→`, emoji,
   * ideograma. Então `'€€€'` é uma string não-vazia, que passa em `name.trim() !== ''` sobre o valor
   * cru, e produz 40 posições em branco no arquivo. A guarda mede o que VAI PARA O ARQUIVO, e é o
   * que a faz pegar este caso.
   */
  it('recusa nome cujos caracteres não sobrevivem à normalização para ASCII', () => {
    const r = segmentJ52({ ...BASE, beneficiary: { ...CEDENTE, name: '€€€' } });
    assert.equal(errorOf(r), 'billet-party-unidentified');
  });

  // ⚠️ Erro DIFERENTE, e a diferença é a divisão de trabalho: a inscrição é `Num` e falha alto
  // sozinha, em `digits()`. A guarda não a repete, e este caso é o que prova que não precisa.
  it('deixa a inscrição vazia falhar como campo numérico, sem duplicar a checagem', () => {
    const r = segmentJ52({ ...BASE, beneficiary: { ...CEDENTE, document: '' } });
    assert.equal(errorOf(r), 'numeric-field-invalid');
  });

  // A metade verde da prova: o nome legítimo passa. Sem ela, uma guarda que recusasse TUDO
  // satisfaria os casos acima.
  it('aceita o registro cujas duas partes se identificam', () => {
    const r = segmentJ52(BASE);
    assert.ok(isOk(r));
  });
});
