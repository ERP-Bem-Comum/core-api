import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  bradescoAccountCheckDigits,
  verifyAccountCheckDigit,
} from '#src/modules/financial/domain/payout/account-check-digit.ts';

/**
 * Cálculo do dígito verificador da conta Bradesco — issue #734, CA5.
 *
 * FONTE PRIMÁRIA: Manual de Procedimentos 4008-523-0096 v16 (jun/2019), p. 30, seção "CÁLCULO DO
 * DÍGITO DE CONTROLE DA AGÊNCIA E C/C BRADESCO". O arquivo vive em `handbook/guidelines/`
 * (gitignored — documentação com restrição de redistribuição) e é o manual COMPANHEIRO do
 * `jun-19-layout-multipag.pdf` que o resto do módulo já cita.
 *
 * ⚠️ Não é fonte secundária, e a distinção importa: onze artefatos deste repositório já afirmaram
 * um layout de arquivo bancário que o banco recusa, porque citavam uns aos outros. O layout define
 * o CAMPO (G011); só este manual define o CÁLCULO.
 *
 * O primeiro caso abaixo é o exemplo LITERAL do manual — se ele quebrar, quem mudou fomos nós.
 */

describe('bradescoAccountCheckDigits — o exemplo literal do manual', () => {
  it('reproduz o exemplo da p. 30: 9999 → 6', () => {
    // "Efetuar a multiplicação da direita para a esquerda: 9 9 9 9 × 5 4 3 2
    //  Efetuar o somatório do resultado da multiplicação: 45 + 36 + 27 + 18 = 126
    //  Dividir o resultado do somatório por 11 [resto 5]
    //  11 - 5 = 6 (O resultado da subtração será o dígito)"
    //
    // O manual exemplifica com a AGÊNCIA e depois diz, para a conta: "O critério a ser adotado deve
    // ser o mesmo ao da agência, conforme acima." Por isso o exemplo da agência é o teste do
    // cálculo da conta — é o mesmo cálculo, aplicado a outro campo.
    assert.deepEqual(bradescoAccountCheckDigits('9999'), ['6']);
  });

  it('é invariante a zeros à esquerda — o padding de `decomposePayeeAccount` não muda o dígito', () => {
    // `decomposePayeeAccount` entrega a conta com `padStart(12, '0')` porque o campo do arquivo tem
    // largura fixa. Se o cálculo dependesse do padding, o DV mudaria entre o pré-voo e a emissão.
    // Não depende, por construção: o peso cresce da direita para a esquerda, e `0 × peso = 0`.
    assert.deepEqual(bradescoAccountCheckDigits('0009999'), ['6']);
    assert.deepEqual(bradescoAccountCheckDigits('000000009999'), ['6']);
  });

  it('resto 0 devolve dígito 0 — a primeira metade da Nota do manual', () => {
    // "Se o resto da divisão for 0 (zero), o dígito será igual a zero (0)"
    // 1000013 → soma 11 → resto 0. Sem a regra, `11 - 0` daria 11, que não é dígito.
    assert.deepEqual(bradescoAccountCheckDigits('1000013'), ['0']);
  });

  it('resto 1 admite DOIS dígitos, 0 e P — a segunda metade da Nota', () => {
    // "e se o resto for 1 (um), o dígito poderá ser igual a zero ou 'P'."
    //
    // Esta é a não-determinação LEGÍTIMA do algoritmo, e é por ela que a função devolve lista. Um
    // validador que escolhesse um dos dois reprovaria cadastros corretos — e a recusa seria nossa,
    // não do banco.
    assert.deepEqual(bradescoAccountCheckDigits('1000005'), ['0', 'P']);
  });
});

describe('verifyAccountCheckDigit — o veredito de três estados', () => {
  const BRADESCO = '237';

  it('confirma o dígito correto', () => {
    assert.deepEqual(verifyAccountCheckDigit(BRADESCO, '9999', '6'), { status: 'match' });
  });

  it('aceita as DUAS respostas certas quando o resto é 1', () => {
    assert.deepEqual(verifyAccountCheckDigit(BRADESCO, '1000005', '0'), { status: 'match' });
    assert.deepEqual(verifyAccountCheckDigit(BRADESCO, '1000005', 'P'), { status: 'match' });
    // Minúscula é a mesma resposta: o cadastro é texto livre digitado por gente.
    assert.deepEqual(verifyAccountCheckDigit(BRADESCO, '1000005', 'p'), { status: 'match' });
  });

  it('recusa o dígito errado e DIZ qual seria o certo', () => {
    // Devolver `expected` é o que transforma a recusa em instrução de correção. Sem ele, o operador
    // sabe que está errado e não sabe para o quê.
    assert.deepEqual(verifyAccountCheckDigit(BRADESCO, '9999', '0'), {
      status: 'mismatch',
      expected: ['6'],
    });
  });

  it('é o defeito da #734 que este veredito pega: DV da agência colado no campo da conta', () => {
    // O cenário medido em produção: a instituição concentradora tem agência única terminada em `0`,
    // e 27 de 50 cadastros trazem `0` no campo DV da conta. Para uma conta cujo dígito é 6, o `0`
    // copiado da agência é recusado — que é exatamente o que o banco faria na Modalidade 01.
    const verdict = verifyAccountCheckDigit(BRADESCO, '9999', '0');
    assert.equal(verdict.status, 'mismatch');
  });

  it('não afirma nada sobre banco cujo algoritmo não está no acervo', () => {
    // CA6: onde não dá para calcular, a resposta honesta é "não verificável". Nem aprovar (afirmaria
    // uma verificação que não houve) nem reprovar (recusaria pagamento por ignorância nossa).
    assert.deepEqual(verifyAccountCheckDigit('001', '9999', '0'), {
      status: 'not-verifiable',
      reason: 'unsupported-bank',
    });
    assert.deepEqual(verifyAccountCheckDigit('260', '9999', '6'), {
      status: 'not-verifiable',
      reason: 'unsupported-bank',
    });
  });

  it('distingue "não sei calcular" de "o dado está quebrado"', () => {
    // A ação do operador é outra em cada caso: a primeira se resolve com documentação do banco, a
    // segunda com correção do cadastro.
    assert.deepEqual(verifyAccountCheckDigit(BRADESCO, '12A45', '6'), {
      status: 'not-verifiable',
      reason: 'account-not-numeric',
    });
  });
});
