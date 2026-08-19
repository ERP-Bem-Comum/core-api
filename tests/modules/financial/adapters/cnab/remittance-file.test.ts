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
  convenio: '1234567',
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

const linesOf = (content: string): readonly string[] => content.split(LINE_TERMINATOR);

// Posições que a #751 disputa. Nomeadas porque as três aparecem juntas em toda asserção daquele
// grupo, e um deslocamento de coluna é exatamente o defeito que elas existem para pegar.
const launchFormOf = (line: string): string => at(line, 12, 13); // G029, header de lote
const clearingOf = (line: string): string => at(line, 18, 20); // P001, Segmento A
const payeeBankOf = (line: string): string => at(line, 21, 23); // P002, Segmento A

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

    // header de arquivo · (header de lote, A, B, trailer de lote) · (header, J, trailer) · trailer
    assert.equal(types, '013351359');
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
    assert.equal(batchOf(lines[7] ?? ''), '0002'); // trailer do 2º lote
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

    assert.equal(Number(at(billetTrailer, 18, 23)), 4); // header + J + J + trailer
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

describe('Remessa Multipag — decisões que o layout NÃO especifica', () => {
  // O PDF do layout não define terminador de linha nem se a última linha leva um. Estas duas
  // escolhas estão fixadas aqui de propósito: se o banco recusar um arquivo bem formado, o teste
  // mostra exatamente o que assumimos, e mudar é trocar uma constante — não caçar no código.
  it('separa as linhas com CRLF', () => {
    const file = build([payment(1, 100)]);
    assert.equal(LINE_TERMINATOR, '\r\n');
    assert.ok(file.content.includes('\r\n'));
  });

  it('não emite terminador após a última linha', () => {
    const file = build([payment(1, 100)]);
    assert.ok(!file.content.endsWith(LINE_TERMINATOR));
    assert.equal(file.content.length, 240 * 6 + LINE_TERMINATOR.length * 5);
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
  it('recusa a remessa inteira quando um título é de rota sem emissor', () => {
    for (const route of ['pix', 'tax-guide'] as const) {
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
