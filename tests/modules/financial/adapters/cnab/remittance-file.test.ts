import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import type { CedenteHeaderData } from '#src/modules/financial/adapters/cnab/multipag-records.ts';
import type { Payee } from '#src/modules/financial/adapters/cnab/multipag-segments.ts';
// W0 RED: o montador do arquivo de remessa ainda não existe.
import {
  buildRemittanceFile,
  LINE_TERMINATOR,
  type RemittancePayment,
} from '#src/modules/financial/adapters/cnab/remittance-file.ts';

const CEDENTE: CedenteHeaderData = {
  bankCode: '237',
  documentType: '2',
  document: '12345678000199',
  convenio: '000000',
  agency: '1234',
  agencyDigit: '5',
  accountNumber: '567890',
  accountDigit: '1',
  accountAgencyDigit: '2',
  companyName: 'ASSOCIACAO BEM COMUM',
};

// O banco do favorecido decide a forma de lançamento e, através dela, a câmara (#751). O default
// `341` é uma instituição DIFERENTE da do cedente — é o caso da transferência interbancária.
const payee = (n: number, bankCode = '341'): Payee => ({
  name: `FORNECEDOR ${n}`,
  documentType: '2',
  document: `9876543200011${n}`,
  bankCode,
  agency: '4321',
  agencyDigit: '0',
  accountNumber: `11223${n}`,
  accountDigit: '4',
});

const PAYMENT_DATE = new Date(Date.UTC(2026, 7, 12));

const payment = (n: number, valueCents: number, payeeBank = '341'): RemittancePayment => ({
  route: 'transfer',
  payee: payee(n, payeeBank),
  paymentDate: PAYMENT_DATE,
  valueCents,
});

// Boleto de OUTRO banco (prefixo 341 ≠ 237 do cedente): forma de lançamento distinta da
// transferência, logo lote distinto — é o que torna o multi-lote verificável.
const barcodeOf = (issuerBank: string, n: number): string =>
  `${issuerBank}9${String(n).padStart(3, '0')}`.padEnd(44, '7');

const billet = (n: number, valueCents: number, issuerBank = '341'): RemittancePayment => ({
  route: 'billet',
  barcode: barcodeOf(issuerBank, n),
  beneficiaryName: `FORNECEDOR ${n}`,
  // Inscrição do CEDENTE do título, que o Segmento J-52 exige (#891). Sintética, como a do
  // `payee` acima — os repositórios são públicos e fixture é o caminho por onde dado real entra.
  beneficiaryDocumentType: '2',
  beneficiaryDocument: `9876543200011${n}`,
  dueDate: new Date(Date.UTC(2026, 7, 20)),
  paymentDate: PAYMENT_DATE,
  valueCents,
});

const base = {
  cedente: CEDENTE,
  bankName: 'BRADESCO',
  nsa: 7,
  generatedAt: new Date(Date.UTC(2026, 7, 10, 14, 5, 9)),
};

const at = (line: string, from: number, to: number): string => line.slice(from - 1, to);

const build = (payments: readonly RemittancePayment[]) => {
  const r = buildRemittanceFile({ ...base, payments });
  assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
  return r.value;
};

// Os REGISTROS, sem o vazio que o terminador final produz (#804, defeito 6). Todo registro termina
// em CRLF, o trailer de arquivo inclusive, então `split` devolve um elemento vazio no fim — contá-lo
// como linha faria toda asserção de contagem e de comprimento acusar o arquivo correto.
const linesOf = (content: string): readonly string[] => {
  const parts = content.split(LINE_TERMINATOR);
  return parts.at(-1) === '' ? parts.slice(0, -1) : parts;
};

// Posições que a #751 disputa. Nomeadas porque as três aparecem juntas em toda asserção daquele
// grupo, e um deslocamento de coluna é exatamente o defeito que elas existem para pegar.
const launchFormOf = (line: string): string => at(line, 12, 13); // G029, header de lote
const clearingOf = (line: string): string => at(line, 18, 20); // P001, Segmento A
const payeeBankOf = (line: string): string => at(line, 21, 23); // P002, Segmento A
const tedPurposeOf = (line: string): string => at(line, 220, 224); // P011, Segmento A (#813)

const isSegmentA = (line: string): boolean => at(line, 8, 8) === '3' && at(line, 14, 14) === 'A';

// Os DETALHES de cada lote, na ordem dos lotes. Varre pelo tipo de registro — a mesma disciplina do
// inspetor: posição de linha só funciona enquanto o arquivo tem um lote.
const batchDetailsOf = (content: string): readonly (readonly string[])[] => {
  const batches: string[][] = [];
  for (const line of linesOf(content)) {
    const type = at(line, 8, 8);
    if (type === '1') batches.push([]);
    else if (type === '3') batches[batches.length - 1]?.push(line);
  }
  return batches;
};

describe('Remessa Multipag — estrutura do arquivo', () => {
  it('um pagamento produz 6 linhas: envelope de arquivo, de lote e o par A+B', () => {
    const file = build([payment(1, 1000)]);
    const lines = linesOf(file.content);

    assert.equal(lines.length, 6);
    assert.equal(at(lines[0] ?? '', 8, 8), '0'); // header de arquivo
    assert.equal(at(lines[1] ?? '', 8, 8), '1'); // header de lote
    assert.equal(at(lines[2] ?? '', 14, 14), 'A');
    assert.equal(at(lines[3] ?? '', 14, 14), 'B');
    assert.equal(at(lines[4] ?? '', 8, 8), '5'); // trailer de lote
    assert.equal(at(lines[5] ?? '', 8, 8), '9'); // trailer de arquivo
  });

  it('toda linha tem 240 posições, sem exceção', () => {
    const file = build([payment(1, 1000), payment(2, 2000), payment(3, 3000)]);
    assert.ok(linesOf(file.content).every((l) => l.length === 240));
  });

  it('numera os detalhes em sequência dentro do lote, a partir de 1', () => {
    const file = build([payment(1, 1000), payment(2, 2000)]);
    const lines = linesOf(file.content);

    assert.equal(at(lines[2] ?? '', 9, 13), '00001'); // A do 1º pagamento
    assert.equal(at(lines[3] ?? '', 9, 13), '00002'); // B do 1º
    assert.equal(at(lines[4] ?? '', 9, 13), '00003'); // A do 2º
    assert.equal(at(lines[5] ?? '', 9, 13), '00004'); // B do 2º
  });
});

describe('Remessa Multipag — os totais são DERIVADOS, não informados', () => {
  // Esta é a razão de o montador existir. Enquanto a contagem for responsabilidade do chamador,
  // um erro nela passa despercebido até o banco recusar o arquivo inteiro.
  it('a quantidade de registros do trailer de arquivo bate com as linhas emitidas', () => {
    for (const count of [1, 2, 5]) {
      const file = build(Array.from({ length: count }, (_, i) => payment(i + 1, 100)));
      const lines = linesOf(file.content);
      const trailer = lines[lines.length - 1] ?? '';

      assert.equal(Number(at(trailer, 24, 29)), lines.length);
      assert.equal(file.lineCount, lines.length);
    }
  });

  it('a quantidade de registros do trailer de LOTE conta o próprio envelope do lote', () => {
    const file = build([payment(1, 100), payment(2, 200)]);
    const lines = linesOf(file.content);
    const batchTrailerLine = lines[lines.length - 2] ?? '';

    // header de lote + 4 detalhes + trailer de lote = 6
    assert.equal(Number(at(batchTrailerLine, 18, 23)), 6);
  });

  it('a somatória do trailer de lote bate com a soma dos pagamentos', () => {
    const file = build([payment(1, 12345), payment(2, 6789), payment(3, 1)]);
    const lines = linesOf(file.content);
    const batchTrailerLine = lines[lines.length - 2] ?? '';

    assert.equal(Number(at(batchTrailerLine, 24, 41)), 12345 + 6789 + 1);
    assert.equal(file.totalCents, 19135);
  });

  it('declara um lote quando há uma forma só', () => {
    const file = build([payment(1, 100)]);
    const lines = linesOf(file.content);
    assert.equal(Number(at(lines[lines.length - 1] ?? '', 18, 23)), 1);
  });
});

describe('Remessa Multipag — um lote por forma de lançamento (#711)', () => {
  // O CA1. Antes desta fatia, o lote era a constante `SINGLE_BATCH` e todo pagamento virava o par
  // de crédito em conta: um boleto na seleção sairia como transferência, com a câmara de TED e
  // dados bancários que aquela rota não usa. Arquivo aceito pelo banco, pagamento errado.
  it('separa transferência e boleto em lotes próprios, cada um com header e trailer', () => {
    const file = build([payment(1, 1000), billet(2, 2000)]);
    const lines = linesOf(file.content);
    const types = lines.map((l) => at(l, 8, 8)).join('');

    // header de arquivo · (header de lote, A, B, trailer) · (header, J, J-52, trailer) · trailer
    //
    // As duas rotas emitem PAR de registros, e é simetria de layout, não coincidência: o crédito em
    // conta precisa do B para o endereço do favorecido, e o título de cobrança precisa do J-52 para
    // identificar sacado e cedente (#891). Enquanto o boleto saía sozinho, esta linha era
    // `013351359` — um registro a menos, que o trailer fechava e o banco não reconhecia.
    assert.equal(types, '0133513359');
    assert.equal(file.batchCount, 2);
  });

  it('numera os lotes a partir de 1, e todo registro repete o número do seu lote', () => {
    const lines = linesOf(build([payment(1, 1000), billet(2, 2000)]).content);
    const batchOf = (line: string): string => at(line, 4, 7);

    assert.equal(batchOf(lines[1] ?? ''), '0001'); // header do 1º lote
    assert.equal(batchOf(lines[2] ?? ''), '0001'); // Segmento A
    assert.equal(batchOf(lines[3] ?? ''), '0001'); // Segmento B
    assert.equal(batchOf(lines[4] ?? ''), '0001'); // trailer do 1º lote
    assert.equal(batchOf(lines[5] ?? ''), '0002'); // header do 2º lote
    assert.equal(batchOf(lines[6] ?? ''), '0002'); // Segmento J
    assert.equal(batchOf(lines[7] ?? ''), '0002'); // Segmento J-52
    assert.equal(batchOf(lines[8] ?? ''), '0002'); // trailer do 2º lote
  });

  // O CA2: sem isto, o segundo lote continuaria a contagem do primeiro e o banco recusaria o
  // arquivo — o campo declara a posição do registro DENTRO do lote.
  it('o sequencial do detalhe reinicia em 1 a cada lote', () => {
    const lines = linesOf(build([payment(1, 1000), payment(2, 1000), billet(3, 2000)]).content);

    assert.equal(at(lines[2] ?? '', 9, 13), '00001'); // A do 1º pagamento
    assert.equal(at(lines[5] ?? '', 9, 13), '00004'); // B do 2º pagamento — ainda no lote 1
    assert.equal(at(lines[8] ?? '', 9, 13), '00001'); // J — primeiro detalhe do lote 2
  });

  it('cada trailer de lote conta e soma APENAS o seu lote', () => {
    const lines = linesOf(build([payment(1, 1500), billet(2, 700), billet(3, 300)]).content);
    const transferTrailer = lines[4] ?? '';
    const billetTrailer = lines[lines.length - 2] ?? '';

    assert.equal(Number(at(transferTrailer, 18, 23)), 4); // header + A + B + trailer
    assert.equal(Number(at(transferTrailer, 24, 41)), 1500);

    // header + (J + J-52) + (J + J-52) + trailer. ⚠️ A SOMATÓRIA não muda: o J-52 não carrega valor,
    // e contá-lo duas vezes dobraria o total do lote. É a distinção que `paymentCentsOf` faz no
    // inspetor — registro que existe e não paga.
    assert.equal(Number(at(billetTrailer, 18, 23)), 6);
    assert.equal(Number(at(billetTrailer, 24, 41)), 1000);
  });

  it('o trailer do arquivo declara a quantidade real de lotes, não 1', () => {
    const lines = linesOf(build([payment(1, 100), billet(2, 200)]).content);
    assert.equal(Number(at(lines[lines.length - 1] ?? '', 18, 23)), 2);
  });

  it('boletos do mesmo banco emissor ficam no mesmo lote, ainda que intercalados na seleção', () => {
    const file = build([billet(1, 100), payment(2, 200), billet(3, 300)]);

    // Dois lotes, não três: o agrupamento é por FORMA, não pela ordem de chegada.
    assert.equal(file.batchCount, 2);
  });

  // A ordem dos lotes é parte do contrato: fosse implícita, dois arquivos com a mesma seleção
  // sairiam diferentes conforme um detalhe que o operador não vê.
  it('ordena os lotes pela primeira aparição da forma na seleção', () => {
    const billetFirst = linesOf(build([billet(1, 100), payment(2, 200)]).content);
    assert.equal(at(billetFirst[2] ?? '', 14, 14), 'J');

    const transferFirst = linesOf(build([payment(1, 100), billet(2, 200)]).content);
    assert.equal(at(transferFirst[2] ?? '', 14, 14), 'A');
  });

  // A forma sai do dado do título (CA11): o banco emissor está nos três primeiros dígitos do código
  // de barras, e título do próprio banco é outra operação — logo, outro lote.
  it('boleto do próprio banco e de outro banco não dividem lote', () => {
    const file = build([billet(1, 100, '237'), billet(2, 200, '341')]);
    assert.equal(file.batchCount, 2);
  });
});

/**
 * O defeito da #751, medido no arquivo pronto — que é onde ele aparecia: toda transferência saía
 * com forma `41` (TED outra titularidade) e câmara `018`, e para favorecido do próprio Bradesco
 * esse par é registro que o validador oficial do banco RECUSA.
 *
 * Fonte primária (`jun-19-layout-multipag.pdf`, local-only): G029 na p. 100, nota (2) da mesma
 * descrição na p. 101 (tabela forma → câmara) e a ocorrência 'AK' de G059 na p. 107 (`018` para
 * TED, zeros para as demais modalidades, colunas 018 a 020 do Segmento A).
 */
describe('Remessa Multipag — crédito em conta e câmara, pelo banco do favorecido (#751)', () => {
  // CA1.
  it('favorecido no banco do cedente sai como crédito em conta, com a câmara zerada', () => {
    const lines = linesOf(build([payment(1, 1000, CEDENTE.bankCode)]).content);

    assert.equal(launchFormOf(lines[1] ?? ''), '01');
    assert.equal(clearingOf(lines[2] ?? ''), '000');
  });

  // CA2. A segunda asserção é o que impede a "correção" preguiçosa de zerar a câmara para todos.
  it('favorecido de outra instituição mantém transferência interbancária e a câmara dela', () => {
    const lines = linesOf(build([payment(1, 1000, '341')]).content);

    assert.equal(launchFormOf(lines[1] ?? ''), '41');
    assert.equal(clearingOf(lines[2] ?? ''), '018');
    assert.notEqual(clearingOf(lines[2] ?? ''), '000');
  });

  // CA6 — o defeito virado teste de regressão. Enquanto o validador oficial não vira gate (é a
  // Onda 1 do épico #756), esta asserção é o único lugar que reprova o par proibido.
  it('nenhum Segmento A de favorecido do próprio banco carrega câmara de TED', () => {
    const file = build([
      payment(1, 100, CEDENTE.bankCode),
      payment(2, 200, '341'),
      payment(3, 300, CEDENTE.bankCode),
    ]);
    const segmentsA = linesOf(file.content).filter(isSegmentA);

    assert.equal(segmentsA.length, 3, 'guarda contra verde por vacuidade');
    for (const a of segmentsA) {
      const expected = payeeBankOf(a) === CEDENTE.bankCode ? '000' : '018';
      assert.equal(clearingOf(a), expected, `banco ${payeeBankOf(a)}`);
    }
  });

  // CA3. A regra é do validador oficial, não do manual: lote cujos Segmentos A misturem bancos é
  // recusado (ERP-Bem-Comum/cnab-validator#2).
  it('nenhum lote mistura bancos de favorecido', () => {
    const file = build([
      payment(1, 100, CEDENTE.bankCode),
      payment(2, 200, '341'),
      payment(3, 300, '001'),
      payment(4, 400, CEDENTE.bankCode),
    ]);

    for (const details of batchDetailsOf(file.content)) {
      const banks = new Set(details.filter(isSegmentA).map(payeeBankOf));
      assert.equal(banks.size, 1, `um lote reuniu ${[...banks].join(', ')}`);
    }
  });

  // O contrapeso do teste acima: sem ele, "um lote por pagamento" passaria e produziria um arquivo
  // com tantos envelopes quantos títulos.
  it('favorecidos do MESMO banco continuam num lote só, ainda que intercalados', () => {
    const file = build([
      payment(1, 100, '341'),
      payment(2, 200, CEDENTE.bankCode),
      payment(3, 300, '341'),
    ]);

    assert.equal(file.batchCount, 2);
  });
});

/**
 * Finalidade da TED no arquivo montado — P011, Segmento A, colunas 220-224 (#813).
 *
 * O defeito: `tedPurpose` era opcional no montador e ninguém o preenchia, então o `?? ''` do
 * Segmento A escrevia cinco brancos em TODA remessa, TED inclusive. O arquivo saía bem-formado e o
 * Validador Universal o recusou em 21/08/2026.
 *
 * O valor é `00005` — pagamento a fornecedores —, decisão da P.O. de 21/08 registrada na #813, com
 * a premissa declarada junto da constante em `batch-profile.ts`. Estes testes verificam a FIAÇÃO:
 * que o montador liga a forma do lote ao campo do detalhe, e que não liga os dois errado.
 *
 * ⚠️ `00007` seria ALUGUEL. O `07 - Pagamento de Fornec/Honor.` que parece a resposta certa é da
 * tabela de DOC, de outro layout. É a armadilha que a #813 documenta, e o teste abaixo a reprova.
 */
describe('Remessa Multipag — a finalidade da TED sai da forma do lote (#813)', () => {
  // CA1.
  it('todo Segmento A de lote TED declara pagamento a fornecedores', () => {
    const file = build([payment(1, 1000, '341'), payment(2, 2000, '341')]);
    const segmentsA = linesOf(file.content).filter(isSegmentA);

    assert.equal(segmentsA.length, 2, 'guarda contra verde por vacuidade');
    for (const a of segmentsA) assert.equal(tedPurposeOf(a), '00005');
  });

  // CA2 — pendente do Validador Universal. Crédito em conta sai em branco, que é o status quo. A
  // P.O. decidiu explicitamente não fixar valor aqui até duas submissões (branco × preenchido)
  // dizerem qual regra vale; se vier `00010`, muda `tedPurposeFor` e este teste, e mais nada.
  it('crédito em conta sai com 220-224 em branco — CA2 pendente do validador', () => {
    const file = build([payment(1, 1000, CEDENTE.bankCode)]);
    const [a] = linesOf(file.content).filter(isSegmentA);

    assert.equal(launchFormOf(linesOf(file.content)[1] ?? ''), '01', 'a fixture precisa ser `01`');
    assert.equal(tedPurposeOf(a ?? ''), '     ');
  });

  // O teste que pega o defeito de verdade, no molde do CA6 da #751: num arquivo MISTO, cada
  // Segmento A tem de carregar a finalidade da SUA forma. Uma constante escrita direto no segmento
  // passaria nos dois testes acima isoladamente e falharia aqui — que é o modo de falha real.
  it('num arquivo misto, cada Segmento A carrega a finalidade da forma do seu lote', () => {
    const file = build([
      payment(1, 100, CEDENTE.bankCode),
      payment(2, 200, '341'),
      payment(3, 300, CEDENTE.bankCode),
      payment(4, 400, '001'),
    ]);
    const segmentsA = linesOf(file.content).filter(isSegmentA);

    assert.equal(segmentsA.length, 4, 'guarda contra verde por vacuidade');
    for (const a of segmentsA) {
      // A câmara é o testemunho independente de qual forma o lote tem: `018` é TED, `000` não é.
      const expected = clearingOf(a) === '018' ? '00005' : '     ';
      assert.equal(tedPurposeOf(a), expected, `banco ${payeeBankOf(a)}, câmara ${clearingOf(a)}`);
    }
  });

  // ⚠️ A armadilha da #813, virada regressão: `00007` é ALUGUEL na tabela de TED do Bacen. O `07`
  // que o manual Bradesco lista como "Pagamento de Fornec/Honor." é da tabela de DOC, posições
  // 381-382 de outro layout — coordenada que sequer existe num registro de 240 posições.
  it('nenhum Segmento A declara aluguel no lugar de pagamento a fornecedores', () => {
    const file = build([payment(1, 100, '341'), payment(2, 200, CEDENTE.bankCode)]);

    for (const a of linesOf(file.content).filter(isSegmentA)) {
      assert.notEqual(tedPurposeOf(a), '00007', 'aluguel — a tabela errada');
      assert.notEqual(tedPurposeOf(a), '07   ', 'código de DOC alinhado à esquerda');
    }
  });
});

describe('Remessa Multipag — decisões que o layout NÃO especifica', () => {
  // O PDF do layout não define terminador de linha nem se a última linha leva um. Estas duas
  // escolhas estão fixadas aqui de propósito: se o banco recusar um arquivo bem formado, o teste
  // mostra exatamente o que assumimos, e mudar é trocar uma constante — não caçar no código.
  it('separa as linhas com CRLF', () => {
    const file = build([payment(1, 100)]);
    assert.equal(LINE_TERMINATOR, '\r\n');
    assert.ok(file.content.includes('\r\n'));
  });

  // #804, defeito 6. A suposição anterior — "sem terminador na última linha" — era declarada e
  // sabidamente frágil; o Validador Universal a derrubou. TODO registro termina em CRLF, o
  // trailer de arquivo inclusive.
  //
  // ⚠️ O assert é sobre COMPRIMENTO EM BYTES, e não sobre `split(LINE_TERMINATOR)`. O inspetor
  // interno faz `split` do que o montador faz `join`: as duas operações desfazem o mesmo erro
  // simetricamente, e um teste escrito assim ficaria verde sem provar nada. A conta é a única
  // testemunha que distingue N-1 terminadores de N.
  it('emite terminador após TODAS as linhas, a última inclusive', () => {
    const file = build([payment(1, 100)]);
    assert.ok(file.content.endsWith(LINE_TERMINATOR));
    assert.equal(file.content.length, (240 + LINE_TERMINATOR.length) * 6);
  });
});

describe('Remessa Multipag — recusas', () => {
  it('recusa remessa sem pagamento algum, em vez de gerar arquivo vazio', () => {
    const r = buildRemittanceFile({ ...base, payments: [] });
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-without-payments');
  });

  // O CA3. A alternativa — emitir o par de crédito em conta por omissão — produziria arquivo
  // bem-formado, aceito pelo banco, pagando pela rota errada. É a pior falha possível aqui, porque
  // não deixa rastro: nada avisa, e o dinheiro sai.
  //
  // ⚠️ A lista era `['pix', 'tax-guide']` até a #838, e agora tem UM elemento — não porque o caso
  // enfraqueceu, mas porque o Pix ganhou emissor. A guia não é "a próxima da fila": ela está fora da
  // remessa por decisão de escopo da P.O. (23/08), e não há release que a mova. Este teste passa a
  // ser o guarda de uma rota só, e é o certo enquanto ela for a única sem emissor.
  it('recusa a remessa inteira quando um título é de rota sem emissor', () => {
    for (const route of ['tax-guide'] as const) {
      const r = buildRemittanceFile({
        ...base,
        payments: [payment(1, 100), { route, valueCents: 500, paymentDate: PAYMENT_DATE }],
      });
      assert.ok(isErr(r), route);
      assert.equal(r.error, 'remittance-launch-form-unsupported');
    }
  });

  it('recusa boleto cujo código de barras não permite ler o banco emissor', () => {
    const r = buildRemittanceFile({
      ...base,
      payments: [
        { ...(billet(1, 100) as Extract<RemittancePayment, { route: 'billet' }>), barcode: 'XX' },
      ],
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-billet-bank-unreadable');
  });

  it('propaga o erro de um pagamento sem emitir arquivo parcial', () => {
    const r = buildRemittanceFile({
      ...base,
      payments: [payment(1, 100), { ...payment(2, 100), valueCents: 10 ** 16 }],
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'numeric-field-overflow');
  });
});

/**
 * A referência de casamento do retorno — G064, colunas 074-093 (issue #752).
 *
 * O que esta suíte protege não é a aritmética da referência: é a CORRESPONDÊNCIA entre a referência
 * devolvida e o pagamento que a recebeu. O montador devolve `yourNumbers` na ordem de ENTRADA, e o
 * use case casa por índice com os `documentId` que possui — mas `groupIntoBatches` REORDENA os
 * pagamentos por forma de lançamento e banco do favorecido.
 *
 * Se esse contrato quebrar, cada referência é gravada contra o documento errado. O arquivo continua
 * válido, o banco continua aceitando, e o erro só aparece meses depois — no primeiro retorno real,
 * quando o pagamento de um fornecedor for baixado no título de outro. É a pior classe de falha do
 * módulo, e é silenciosa por construção: nenhum gate de layout a pega.
 */
describe('Remessa Multipag — a referência do retorno (G064, #752)', () => {
  const yourNumberOf = (line: string): string => at(line, 74, 93);

  it('preenche G064 em todo Segmento A — nunca em branco', () => {
    const file = build([payment(1, 1000), payment(2, 2000)]);
    const segmentsA = linesOf(file.content).filter(isSegmentA);

    assert.equal(segmentsA.length, 2);
    for (const line of segmentsA) {
      assert.notEqual(yourNumberOf(line).trim(), '', 'G064 em branco é retorno sem chave');
    }
  });

  it('compõe convênio + NSA + posição, ocupando as 20 posições do campo', () => {
    // CEDENTE.convenio = '1234567' (7) → 8 posições; NSA 7 → 6; posição 1 → 6.
    const file = build([payment(1, 1000)]);
    const [firstA] = linesOf(file.content).filter(isSegmentA);

    assert.equal(yourNumberOf(firstA ?? ''), '00000000000007000001');
    assert.equal(yourNumberOf(firstA ?? '').length, 20);
  });

  it('devolve uma referência por pagamento, na ordem de ENTRADA', () => {
    const file = build([payment(1, 1000), payment(2, 2000), payment(3, 3000)]);

    assert.deepEqual(file.yourNumbers, [
      '00000000000007000001',
      '00000000000007000002',
      '00000000000007000003',
    ]);
  });

  // ⚠️ O teste central. Três transferências que o agrupamento REORDENA: as entradas 1 e 3 vão para
  // um favorecido do banco 341 e a entrada 2 para o 033, e o lote é por banco do favorecido
  // (#751/cnab-validator#2). A emissão passa a ver 1, 3, 2 — e mesmo assim `yourNumbers` tem de sair
  // na ordem de ENTRADA, senão o casamento associa a referência ao documento errado.
  //
  // São três TRANSFERÊNCIAS de propósito, e não boletos: o boleto emite Segmento J, e a leitura de
  // G064 aqui é por Segmento A. Misturar as rotas esconderia metade dos registros do leitor — foi o
  // que aconteceu na primeira escrita deste caso, que passou a comparar uma lista de um item só.
  it('mantém a ordem de ENTRADA mesmo quando o agrupamento reordena os pagamentos', () => {
    const file = build([payment(1, 1000, '341'), payment(2, 2000, '033'), payment(3, 3000, '341')]);

    // Primeiro a prova de que houve reordenação de verdade — sem ela o caso não testa nada.
    assert.equal(file.batchCount, 2, 'o cenário precisa de dois lotes para reordenar');

    const emittedOrder = batchDetailsOf(file.content).flat().filter(isSegmentA).map(yourNumberOf);

    // Ordem de EMISSÃO: as entradas 1 e 3 (banco 341) saem juntas, a entrada 2 (banco 033) depois —
    // logo a emissão vê 1, 3, 2, e NÃO 1, 2, 3.
    assert.deepEqual(emittedOrder, [
      '00000000000007000001',
      '00000000000007000003',
      '00000000000007000002',
    ]);
    assert.notDeepEqual(emittedOrder, file.yourNumbers, 'o cenário precisa mesmo reordenar');

    // Ordem de ENTRADA: é o que o chamador recebe, e é o que casa com os documentIds dele.
    assert.deepEqual(file.yourNumbers, [
      '00000000000007000001',
      '00000000000007000002',
      '00000000000007000003',
    ]);

    // E as duas são o mesmo conjunto: nenhuma referência foi inventada nem perdida na reordenação.
    assert.deepEqual([...emittedOrder].sort(), [...file.yourNumbers].sort());
  });

  it('não repete referência entre pagamentos do mesmo arquivo', () => {
    const file = build([payment(1, 100), billet(2, 200), payment(3, 300), billet(4, 400)]);
    assert.equal(new Set(file.yourNumbers).size, file.yourNumbers.length);
  });

  // CA4: o NSA distingue arquivos da mesma conta; o convênio distingue as contas entre si. Sem o
  // convênio, duas contas-cedente com o mesmo NSA produziriam a MESMA referência — e o banco devolve
  // só este campo, então o casamento ficaria ambíguo.
  it('não repete referência entre remessas — NSA e convênio entram na composição', () => {
    const a = build([payment(1, 100)]);
    const b = buildRemittanceFile({ ...base, nsa: 8, payments: [payment(1, 100)] });
    const outraConta = buildRemittanceFile({
      ...base,
      // `999999` é a segunda máscara reservada, e existe para exatamente este caso: representar
      // convênio de OUTRA conta sem inventar um número. Ver `bank-fixture-masking.test.ts`.
      cedente: { ...CEDENTE, convenio: '999999' },
      payments: [payment(1, 100)],
    });

    assert.ok(isOk(b) && isOk(outraConta));
    assert.notEqual(a.yourNumbers[0], b.value.yourNumbers[0], 'NSA distinto → referência distinta');
    assert.notEqual(
      a.yourNumbers[0],
      outraConta.value.yourNumbers[0],
      'conta distinta com o MESMO NSA → referência distinta',
    );
  });

  // CA5 da #752: truncar colapsaria referências distintas na mesma string — colisão silenciosa.
  //
  // ⚠️ A BARREIRA MUDOU DE LUGAR na #804, e este teste registra qual delas morde primeiro. O
  // convênio agora é recusado no CAMPO, a 6 posições, antes de a referência ser sequer composta —
  // então nenhum convênio consegue mais estourar as 8 posições que `referenceFor` lhe reserva.
  //
  // O erro `remittance-reference-overflow` continua existindo e continua correto: ele guarda os
  // outros dois componentes da referência (NSA e sequencial), que não passam por esta guarda.
  // Apagá-lo porque o convênio deixou de alcançá-lo removeria a defesa dos outros dois.
  it('recusa o convênio no campo, antes de a referência chegar a estourar', () => {
    const r = buildRemittanceFile({
      ...base,
      cedente: { ...CEDENTE, convenio: '123456789' },
      payments: [payment(1, 100)],
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'convenio-field-overflow');
  });
});

/**
 * A instrução G061, medida no arquivo pronto — que é onde a divergência entre as rotas aparecia.
 *
 * Decisão da P.O. em 24/08/2026 (#805): TODO pagamento entra bloqueado, aguardando liberação dos
 * usuários master no Net Empresa. Antes disto o Segmento A saía `09` e o J saía `00`, então pagar
 * por boleto contornava a dupla checagem que a transferência exige — mesmo dinheiro, mesma conta,
 * sem o segundo par de olhos.
 *
 * ⚠️ Esta suíte é o que impede a porta lateral de voltar a abrir, e por isso lê as DUAS rotas do
 * MESMO arquivo. Medir cada segmento na sua suíte de unidade não pega a divergência: as duas
 * passavam, cada uma descrevendo corretamente a política errada da outra.
 */
describe('Remessa Multipag — todo pagamento entra BLOQUEADO para liberação master (#805)', () => {
  const movementOf = (line: string): string => at(line, 15, 15); // G060
  const instructionOf = (line: string): string => at(line, 16, 17); // G061
  const segmentOf = (line: string): string => at(line, 14, 14);
  const sequenceOf = (line: string): string => at(line, 9, 13);

  // O J-52 grava `'J'` na coluna 014 como o J, e quem os separa é a identificação de registro
  // opcional (G067, 018-019).
  const isSegmentJ52 = (line: string): boolean =>
    segmentOf(line) === 'J' && at(line, 18, 19) === '52';

  // Os detalhes que representam um PAGAMENTO: A (transferência) e J (boleto). Ficam de fora, de
  // propósito, os dois COMPLEMENTOS — o B, que traz endereço do favorecido, e o J-52, que identifica
  // sacado e cedente (#891). Nenhum dos dois carrega a instrução: no B, 015-017 é CNAB em branco; no
  // J-52, 016-017 é o `C004` de cobrança, campo diferente do `G061` apesar da coluna coincidir.
  const isPaymentDetail = (line: string): boolean =>
    at(line, 8, 8) === '3' &&
    !isSegmentJ52(line) &&
    (segmentOf(line) === 'A' || segmentOf(line) === 'J');

  it('grava a instrução 09 em TODO detalhe de pagamento, seja transferência ou boleto', () => {
    // Duas formas na mesma seleção, logo dois lotes: sem as duas rotas no arquivo, o caso não
    // compara política nenhuma.
    const file = build([payment(1, 10_000), billet(2, 5_000), payment(3, 7_500), billet(4, 2_000)]);
    const details = linesOf(file.content).filter(isPaymentDetail);

    // Guarda contra verde por vacuidade: sem os dois segmentos presentes, o laço abaixo aprova
    // qualquer coisa — inclusive um arquivo em que uma das rotas simplesmente não saiu.
    const countOf = (segment: string): number =>
      details.filter((l) => segmentOf(l) === segment).length;
    assert.ok(countOf('A') >= 1, 'o cenário precisa de ao menos um Segmento A');
    assert.ok(countOf('J') >= 1, 'o cenário precisa de ao menos um Segmento J');

    for (const line of details) {
      const where = `segmento ${segmentOf(line)}, detalhe ${sequenceOf(line)}`;
      assert.equal(instructionOf(line), '09', `${where}: instrução liberada é porta lateral`);
      assert.equal(movementOf(line), '0', `${where}: G060 tem de seguir inclusão`);
    }
  });

  // O contrapeso: G060 e G061 são vizinhos de coluna, e o Segmento B começa com três posições de
  // CNAB em branco justamente onde os outros dois gravam movimento e instrução. Sem esta asserção,
  // a "correção" preguiçosa — carimbar `09` em todo registro de detalhe — passaria no caso acima e
  // produziria um B com dado onde o layout manda branco.
  it('não escreve instrução no Segmento B, cujas posições 015-017 são CNAB em branco', () => {
    const file = build([payment(1, 10_000), billet(2, 5_000)]);
    const segmentsB = linesOf(file.content).filter(
      (l) => at(l, 8, 8) === '3' && segmentOf(l) === 'B',
    );

    assert.equal(segmentsB.length, 1, 'guarda contra verde por vacuidade');
    for (const line of segmentsB) {
      assert.equal(at(line, 15, 17), '   ', `detalhe ${sequenceOf(line)}`);
    }
  });

  // O MESMO contrapeso, para o complemento do boleto (#891). O J-52 é o registro em que a
  // "correção" preguiçosa é mais tentadora: ele grava `'J'` na coluna 014 como o J e ocupa as mesmas
  // colunas 015-017 — e um `09` carimbado ali por simetria não seria instrução bloqueada nenhuma.
  //
  // ⚠️ 016-017 no J-52 é o `C004`, "Código de Movimento Remessa", cujo domínio (manual p. 80) diz
  // **'09' = Protestar**. Quem propagasse a política do #805 para cá emitiria arquivo bem-formado
  // mandando PROTESTAR o título que se está pagando — e nenhum inspetor de forma pegaria.
  it('não repete a instrução do J no Segmento J-52: 015 é branco e 016-017 é o C004 zerado', () => {
    const file = build([payment(1, 10_000), billet(2, 5_000)]);
    const segmentsJ52 = linesOf(file.content).filter((l) => at(l, 8, 8) === '3' && isSegmentJ52(l));

    assert.equal(segmentsJ52.length, 1, 'guarda contra verde por vacuidade');
    for (const line of segmentsJ52) {
      const where = `detalhe ${sequenceOf(line)}`;
      assert.equal(movementOf(line), ' ', `${where}: 015 é G004 (CNAB), não o G060 do Segmento J`);
      assert.equal(instructionOf(line), '00', `${where}: 016-017 é C004, e '09' ali é PROTESTAR`);
    }
  });
});

/**
 * O par J + J-52 do boleto (#891, CA1).
 *
 * O manual declara o J-52 obrigatório para título de cobrança (p. 33), e o emissor gravava só o J.
 * Estes casos medem a montagem — que os dois saem, NA ORDEM, com sequenciais consecutivos, e que o
 * trailer do lote conta os dois. A forma do registro isolado é medida em `multipag-segment-j52`.
 */
describe('Remessa Multipag — boleto emite o par J + J-52 (#891)', () => {
  const segmentOf = (line: string): string => at(line, 14, 14);
  const isJ52 = (line: string): boolean => segmentOf(line) === 'J' && at(line, 18, 19) === '52';
  const detailsOf = (content: string): readonly string[] =>
    linesOf(content).filter((l) => at(l, 8, 8) === '3');

  it('emite o J-52 imediatamente depois do J, com o sequencial seguinte', () => {
    const details = detailsOf(build([billet(1, 5_000)]).content);

    assert.equal(details.length, 2, 'o boleto passou a ser um PAR de registros');
    assert.equal(segmentOf(details[0] ?? ''), 'J');
    assert.ok(!isJ52(details[0] ?? ''), 'o primeiro é o J do pagamento, não o complemento');
    assert.ok(isJ52(details[1] ?? ''), 'o segundo é o J-52');

    assert.equal(at(details[0] ?? '', 9, 13), '00001');
    assert.equal(at(details[1] ?? '', 9, 13), '00002');
  });

  it('mantém o par consecutivo com vários boletos no mesmo lote', () => {
    const details = detailsOf(build([billet(1, 100), billet(2, 200), billet(3, 300)]).content);

    assert.equal(details.length, 6);
    // A alternância é o invariante: J, J-52, J, J-52, J, J-52. Um J-52 deslocado ainda produziria
    // seis registros e um trailer fechando — a ordem é o que o banco lê.
    assert.deepEqual(details.map(isJ52), [false, true, false, true, false, true]);
    assert.deepEqual(
      details.map((l) => at(l, 9, 13)),
      ['00001', '00002', '00003', '00004', '00005', '00006'],
    );
  });

  // ⚠️ O nome do cedente aparece em DOIS registros do mesmo pagamento — 062-091 no J e 092-131 no
  // J-52 —, e é o mesmo campo `G013`, do mesmo participante. Se divergirem, o arquivo declara dois
  // beneficiários para um título só, e o banco não tem como saber qual vale.
  it('grava o mesmo nome de cedente no J e no J-52', () => {
    const details = detailsOf(build([billet(1, 5_000)]).content);
    const noJ52 = at(details[0] ?? '', 62, 91);
    const noJ52Complement = at(details[1] ?? '', 92, 131);

    assert.equal(noJ52.trim(), 'FORNECEDOR 1');
    assert.equal(noJ52Complement.trim(), noJ52.trim());
  });

  // O SACADO vem do ENVELOPE, não do pagamento: é a empresa que emite a remessa, a mesma que o
  // header do arquivo declara. Um chamador não tem como afirmá-la diferente — e é isso que se mede.
  it('grava como sacado a empresa do header do arquivo', () => {
    const file = build([billet(1, 5_000)]);
    const j52 = detailsOf(file.content).find(isJ52) ?? '';
    const fileHeader = linesOf(file.content)[0] ?? '';

    assert.equal(at(j52, 20, 20), CEDENTE.documentType);
    assert.equal(at(j52, 21, 35), CEDENTE.document.padStart(15, '0'));
    assert.equal(at(j52, 36, 75).trim(), CEDENTE.companyName);
    // E a inscrição é a MESMA que o header do arquivo grava em 019-032 (G006), sem reformatação.
    assert.equal(at(fileHeader, 19, 32), CEDENTE.document);
  });

  it('o trailer do lote conta o J-52 e não soma o valor dele duas vezes', () => {
    const lines = linesOf(build([billet(1, 700), billet(2, 300)]).content);
    const batchTrailer = lines.find((l) => at(l, 8, 8) === '5') ?? '';

    assert.equal(Number(at(batchTrailer, 18, 23)), 6, 'header + (J + J-52) × 2 + trailer');
    assert.equal(Number(at(batchTrailer, 24, 41)), 1000, 'o J-52 não carrega valor');
  });
});

/*
 * O arquivo de Pix por chave, ponta a ponta (#838, CA1/CA2/CA4).
 *
 * ⚠️ A RÉGUA DESTE BLOCO É O GOLDEN DO BANCO, não a leitura do PDF — e a distinção não é
 * preciosismo. Os testes de unidade dos segmentos medem o que ESTE código programou: se a forma de
 * iniciação tivesse sido escrita como `'004'` em vez de `'04 '`, eles passariam do mesmo jeito. Só um
 * arquivo que o banco emitiu é testemunha externa.
 *
 * Medido em `GOLDEN_TEST_MULTIPAG_PIX_240` (01/09/2026), fornecido pela P.O. e NÃO versionado — ele
 * carrega convênio, conta e inscrição reais, e os repositórios são públicos. O que este arquivo
 * guarda é a ESTRUTURA medida, nunca os valores:
 *
 *   6 registros · header de arquivo com `PIX` em 172-174 · header de lote `20`/`45`/`045`
 *   Segmento A: câmara `009`, bloco bancário do favorecido PREENCHIDO, 220-224 e 225-226 em BRANCOS,
 *               Informação 2 = inscrição(14) + ISPB(8) + `01`(2) + 16 brancos
 *   Segmento B: `04 ` em 015-017, TXID em brancos, chave em 128-226, UG SIAPE zerada, ISPB em 233-240
 *   trailer de lote: 000004
 */
describe('Remessa Multipag — o arquivo de Pix por chave (#838)', () => {
  // Chave aleatória em formato UUID: 36 posições, como a do golden — e sintética, como todo o resto
  // das fixtures deste arquivo.
  const PIX_KEY = '00000000-0000-4000-8000-000000000000';

  // ⚠️ O favorecido do Pix carrega bloco bancário COMPLETO, e é o que o golden mostra no Segmento A.
  // Ver `PixPayment`, no montador: a chave endereça no SPI, o Segmento A identifica a conta.
  const pix = (n: number, valueCents: number, over: Partial<Payee> = {}): RemittancePayment => ({
    route: 'pix',
    payee: { ...payee(n), ...over },
    pixKey: PIX_KEY,
    pixKeyType: 'random-key',
    paymentDate: PAYMENT_DATE,
    valueCents,
  });

  const buildPix = (payments: readonly RemittancePayment[]) => {
    const r = buildRemittanceFile({ ...base, payments });
    assert.ok(isOk(r), `esperava arquivo, veio ${isErr(r) ? r.error : '?'}`);
    return r.value;
  };

  it('tem os 6 registros do golden — sem Segmento J', () => {
    // O J exige código de barras (`G063`, obrigatório em 018-061), e Pix por chave não tem. O J e o
    // J-52 da seção de Pix (p. 41-42) pertencem à forma `47`, QR Code, fora do escopo.
    const lines = linesOf(buildPix([pix(1, 100_00)]).content);

    assert.equal(lines.length, 6);
    assert.deepEqual(
      lines.map((l) => at(l, 8, 8)),
      ['0', '1', '3', '3', '5', '9'],
    );
    assert.deepEqual(
      lines.filter((l) => at(l, 8, 8) === '3').map((l) => at(l, 14, 14)),
      ['A', 'B'],
    );
  });

  it('declara o arquivo como sendo de Pix no header (G021)', () => {
    const header = linesOf(buildPix([pix(1, 100_00)]).content)[0] ?? '';
    assert.equal(at(header, 172, 174), 'PIX');
  });

  it('abre o lote com serviço `20`, forma `45` e layout `045`', () => {
    // ⚠️ `045`, e não uma versão própria: o header de lote da p. 23 é o mesmo para "Pagamento
    // Fornecedor / TED / DOC / Pix". Quem tem versão própria é a cobrança, com `040`.
    const batchHeader = linesOf(buildPix([pix(1, 100_00)]).content)[1] ?? '';

    assert.equal(at(batchHeader, 10, 11), '20');
    assert.equal(at(batchHeader, 12, 13), '45');
    assert.equal(at(batchHeader, 14, 16), '045');
  });

  it('o Segmento A transita pelo SPI e identifica a CONTA do favorecido', () => {
    // A metade contra-intuitiva da rota, e a que a #708 não previa: o bloco bancário sai preenchido.
    // Um Segmento A zerado aqui seria o defeito silencioso — arquivo bem-formado, crédito sem destino.
    const a = linesOf(buildPix([pix(1, 100_00)]).content)[2] ?? '';
    const p = payee(1);

    assert.equal(at(a, 18, 20), '009', 'câmara do SPI');
    assert.equal(at(a, 21, 23), p.bankCode);
    assert.equal(at(a, 24, 28), p.agency.padStart(5, '0'));
    assert.equal(at(a, 30, 41), p.accountNumber.padStart(12, '0'));
  });

  it('o Segmento A não leva finalidade de TED nem finalidade complementar', () => {
    // Medido no golden: os dois em brancos na forma `45`. Preenchê-los fora de TED é recusa
    // (inquiry-0033) — a mesma régua do crédito em conta.
    const a = linesOf(buildPix([pix(1, 100_00)]).content)[2] ?? '';

    assert.equal(at(a, 220, 224), ' '.repeat(5), 'P011');
    assert.equal(at(a, 225, 226), ' '.repeat(2), 'P013');
  });

  it('a Informação 2 carrega inscrição, ISPB e tipo de conta, nessa ordem', () => {
    // As 24 posições que a p. 101 especifica como `CCCCCCCCCCCCCCIIIIIIIIRR`, e as 16 restantes em
    // branco. A ORDEM é o que não se descobre olhando o resultado: os 24 dígitos são uma corrida
    // homogênea, e trocar ISPB de lugar com a inscrição produz um bloco que o inspetor aprova e o
    // banco lê como outro favorecido.
    const a = linesOf(buildPix([pix(1, 100_00)]).content)[2] ?? '';
    const p = payee(1);

    assert.equal(at(a, 178, 191), p.document.padStart(14, '0'), 'inscrição do favorecido');
    assert.match(at(a, 192, 199), /^\d{8}$/, 'ISPB derivado do código de compensação');
    assert.equal(at(a, 200, 201), '01', 'conta corrente — premissa da P.O., ver #817');
    assert.equal(at(a, 202, 217), ' '.repeat(16));
  });

  it('o Segmento B carrega a chave, e não o endereço do favorecido', () => {
    const b = linesOf(buildPix([pix(1, 100_00)]).content)[3] ?? '';

    assert.equal(at(b, 15, 17), '04 ', 'chave aleatória, alinhada à esquerda');
    assert.equal(at(b, 33, 67), ' '.repeat(35), 'TXID');
    assert.equal(at(b, 128, 226).trimEnd(), PIX_KEY);
    assert.equal(at(b, 227, 232), '000000', 'UG SIAPE zerada, como no golden');
    assert.match(at(b, 233, 240), /^\d{8}$/, 'ISPB do PSP');
  });

  it('o ISPB do Segmento A e o do Segmento B são o mesmo — os dois vêm da mesma origem', () => {
    // Dois campos do mesmo pagamento afirmando instituições diferentes seria arquivo bem-formado e
    // incoerente. É por isso que o ISPB é DERIVADO uma vez, do código de compensação, e passado aos
    // dois registros — em vez de recebido pronto do chamador.
    const lines = linesOf(buildPix([pix(1, 100_00)]).content);
    const [a, b] = [lines[2] ?? '', lines[3] ?? ''];

    assert.equal(at(a, 192, 199), at(b, 233, 240));
  });

  it('o trailer do lote conta 4 registros e soma só o Segmento A', () => {
    const lines = linesOf(buildPix([pix(1, 100_00)]).content);
    const batchTrailer = lines.find((l) => at(l, 8, 8) === '5') ?? '';

    assert.equal(Number(at(batchTrailer, 18, 23)), 4, 'header + A + B + trailer');
    assert.equal(Number(at(batchTrailer, 24, 41)), 100_00, 'o Segmento B não carrega valor');
  });

  it('recusa a seleção que mistura Pix com outra modalidade', () => {
    // A partição é do use case (CA4, PR #929): este montador monta UM arquivo, e reparti-lo aqui
    // produziria N arquivos com um NSA só — retransmissão aos olhos do banco.
    const r = buildRemittanceFile({ ...base, payments: [pix(1, 100_00), payment(2, 50_00)] });
    assert.ok(isErr(r));
    assert.equal(r.error, 'remittance-mixed-file-modalities');
  });

  it('recusa o favorecido cujo banco não está na tabela de ISPB, sem inventar', () => {
    // `999` não é participante. O que não pode acontecer é sair com oito zeros: o inspetor aprova —
    // não é defeito de forma — e o banco recusa depois de transmitido.
    const r = buildRemittanceFile({ ...base, payments: [pix(1, 100_00, { bankCode: '999' })] });
    assert.ok(isErr(r));
    assert.equal(r.error, 'payee-ispb-unknown');
  });
});
