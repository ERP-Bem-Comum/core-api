import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  canonicalNaturalKey,
  isSameCedenteAccount,
} from '#src/modules/financial/domain/cedente/natural-key.ts';

/**
 * A CHAVE NATURAL CANÔNICA (#995, bloco A).
 *
 * O defeito: a duplicata comparava as quatro colunas como string CRUA. A mesma conta bancária,
 * escrita de outro jeito, entrava de novo — e entrou, em produção, em 06/09.
 */
const legacy = {
  bankCode: '7',
  agency: '1234-1',
  accountNumber: '0012345',
  accountDigit: '3',
};

const typedOnScreen = {
  bankCode: '007',
  agency: '1234',
  accountNumber: '12345',
  accountDigit: '3',
};

describe('canonicalNaturalKey — a forma que faz duas escritas coincidirem', () => {
  /*
   * ⚠️ O CASO DE PRODUÇÃO, e o único que a issue descreve com dados.
   *
   * A conta migrada do legado estava ATIVA. O operador cadastrou outra, com os MESMOS dados
   * bancários escritos de outro jeito, e passou — porque nenhuma das quatro strings batia. Depois,
   * o teste de envio de remessa não processou.
   */
  it('CA2: a conta do legado e a digitada na tela são a MESMA conta', () => {
    assert.equal(
      canonicalNaturalKey(legacy),
      canonicalNaturalKey(typedOnScreen),
      'as duas escritas continuam sendo contas diferentes para o sistema',
    );
    assert.ok(isSameCedenteAccount(legacy, typedOnScreen));
  });

  // ── Banco: SEMPRE 3 dígitos ────────────────────────────────────────────────────────────────
  //
  // Não é escolha nossa: é o que o CNAB grava (`num(bankCode, 3)`) e o que a tabela FEBRABAN do
  // front documenta como forma canônica do código de compensação.
  it('banco: zeros à esquerda são acrescentados até 3 posições', () => {
    const base = { agency: '1234', accountNumber: '5', accountDigit: '0' };
    const key = (bankCode: string) => canonicalNaturalKey({ ...base, bankCode });

    assert.equal(key('7'), key('007'));
    assert.equal(key('1'), key('001'));
    assert.equal(key('237'), key('237'));
  });

  // ⚠️ `padStart` só COMPLETA, nunca corta. Uma primeira versão não tirava os zeros antes de
  // completar, e `'0237'` continuava `'0237'`, sem bater com `'237'` — a borda aceita os dois
  // (`z.string().min(1).max(10)`). Um extrato legado de largura fixa grava `'0237'`; o operador
  // digita `237`, e a duplicata que esta chave existe para pegar passava de novo.
  it('banco: excesso de zeros à esquerda também colapsa — a forma é IDEMPOTENTE', () => {
    const base = { agency: '1234', accountNumber: '5', accountDigit: '0' };
    const key = (bankCode: string) => canonicalNaturalKey({ ...base, bankCode });

    assert.equal(key('0237'), key('237'));
    assert.equal(key('00007'), key('007'));
  });

  // ── Agência: só os dígitos, sem zeros à esquerda ───────────────────────────────────────────
  //
  // O DV tem coluna própria desde a #856, então separador aqui é resíduo de cadastro antigo.
  /*
   * ⚠️ O DV É DESCARTADO, NÃO CONCATENADO — e o inverso disto é um defeito real que estes casos
   * pegaram durante a escrita.
   *
   * Uma primeira versão usava `replace(/\D/g, '')` na agência, e `'1234-1'` virava `'12341'`: a
   * agência somada ao dígito, exatamente a corrupção que o #856 corrigiu no emissor. `1234-1` é a
   * agência `1234`; o `1` é DV e tem coluna própria.
   *
   * A gramática é `splitCheckDigit`, a MESMA que o ETL usa para decompor a agência legada.
   */
  it('agência: o DV é DESCARTADO e os zeros à esquerda somem', () => {
    const base = { bankCode: '237', accountNumber: '5', accountDigit: '0' };
    const key = (agency: string) => canonicalNaturalKey({ ...base, agency });

    assert.equal(key('1234-1'), key('1234'), 'o DV foi concatenado ao número da agência');
    assert.equal(key('1234/5'), key('1234'), 'o DV foi concatenado ao número da agência');
    assert.equal(key('0288'), key('288'));
  });

  // O contraponto: uma agência SEM separador é o número inteiro, não `1234` + `5`. Adivinhar onde
  // termina o número é o palpite que a #708 proibiu — sem separador, não há DV a descartar.
  it('agência sem separador é o número INTEIRO — nada é descartado por adivinhação', () => {
    const base = { bankCode: '237', accountNumber: '5', accountDigit: '0' };
    const key = (agency: string) => canonicalNaturalKey({ ...base, agency });

    assert.notEqual(key('12345'), key('1234'));
  });

  // ── Conta: sem zeros à esquerda, e sem o DV concatenado ────────────────────────────────────
  it('conta: zeros à esquerda somem', () => {
    const base = { bankCode: '237', agency: '1234', accountDigit: '0' };
    const key = (accountNumber: string) => canonicalNaturalKey({ ...base, accountNumber });

    assert.equal(key('0012345'), key('12345'));
    assert.equal(key('000001'), key('1'));
  });

  /*
   * ⚠️ A CONTA SOFRE DO MESMO PROBLEMA DA AGÊNCIA, e a assimetria era defeito, não desenho.
   *
   * O ETL que embutiu o DV em `agency` embutiu na CONTA também. `digitsOnly('0088123-3')` daria
   * `'00881233'` — conta e dígito colados —, enquanto o operador digita `'88123'` + `'3'`. As duas
   * escritas da MESMA conta continuariam divergindo, e a duplicata passaria.
   *
   * O dígito é RECUPERADO do número só quando a coluna própria está VAZIA: com ela preenchida, ela
   * manda (é a fonte mais recente).
   */
  it('conta: DV embutido é separado, e recuperado quando a coluna do dígito está vazia', () => {
    const legacyEmbedded = {
      bankCode: '237',
      agency: '1234',
      accountNumber: '0088123-3',
      accountDigit: '',
    };
    const typed = {
      bankCode: '237',
      agency: '1234',
      accountNumber: '88123',
      accountDigit: '3',
    };

    assert.ok(
      isSameCedenteAccount(legacyEmbedded, typed),
      'o DV embutido na conta foi concatenado ao número',
    );
  });

  // A coluna preenchida VENCE o que está embutido — ela é o dado mais recente, e deixar o embutido
  // mandar faria uma correção de dígito pela tela não surtir efeito na comparação.
  it('conta: a coluna do dígito, quando preenchida, vence o embutido', () => {
    const base = { bankCode: '237', agency: '1234', accountNumber: '88123-3' };

    assert.notEqual(
      canonicalNaturalKey({ ...base, accountDigit: '9' }),
      canonicalNaturalKey({ ...base, accountDigit: '3' }),
    );
  });

  // ⚠️ Zero NÃO colapsa em vazio. `'000'` é dado presente e mal preenchido; virar `''` o tornaria
  // indistinguível de campo em branco, e duas contas incompletas de contas DIFERENTES passariam a
  // ser "a mesma".
  it('um valor inteiro de zeros continua sendo um valor, não vazio', () => {
    const base = { bankCode: '237', agency: '1234', accountDigit: '0' };

    assert.notEqual(
      canonicalNaturalKey({ ...base, accountNumber: '000' }),
      canonicalNaturalKey({ ...base, accountNumber: '' }),
    );
    assert.equal(
      canonicalNaturalKey({ ...base, accountNumber: '000' }),
      canonicalNaturalKey({ ...base, accountNumber: '0' }),
    );
  });

  // O `P` do Bradesco é DV legítimo (manual 4008-523-0096 v16, p. 30) — a caixa não pode separar
  // duas escritas do mesmo dígito.
  it('dígito: caixa e espaço em volta não fazem diferença', () => {
    const base = { bankCode: '237', agency: '1234', accountNumber: '5' };
    const key = (accountDigit: string) => canonicalNaturalKey({ ...base, accountDigit });

    assert.equal(key('p'), key('P'));
    assert.equal(key(' 3 '), key('3'));
  });

  // ── O outro lado: contas DIFERENTES continuam diferentes ───────────────────────────────────
  //
  // Sem estes casos, uma canonização agressiva demais (que colapsasse tudo) passaria em tudo acima
  // e faria o cadastro recusar contas legítimas.
  it('contas realmente diferentes NÃO colapsam', () => {
    const base = { bankCode: '237', agency: '1234', accountNumber: '5678', accountDigit: '9' };

    for (const other of [
      { ...base, bankCode: '341' },
      { ...base, agency: '4321' },
      { ...base, accountNumber: '8765' },
      { ...base, accountDigit: '0' },
    ]) {
      assert.ok(
        !isSameCedenteAccount(base, other),
        `colapsou contas diferentes: ${JSON.stringify(other)}`,
      );
    }
  });

  // O separador não pode ser ambíguo: se uma parte pudesse conter `|`, duas chaves distintas
  // colidiriam por junção. Todas são dígitos ou um caractere de DV — este caso fixa isso.
  it('a junção não é ambígua entre partes vizinhas', () => {
    assert.notEqual(
      canonicalNaturalKey({
        bankCode: '237',
        agency: '12',
        accountNumber: '345',
        accountDigit: '6',
      }),
      canonicalNaturalKey({
        bankCode: '237',
        agency: '123',
        accountNumber: '45',
        accountDigit: '6',
      }),
    );
  });
});
