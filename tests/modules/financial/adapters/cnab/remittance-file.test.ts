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

const payee = (n: number): Payee => ({
  name: `FORNECEDOR ${n}`,
  documentType: '2',
  document: `9876543200011${n}`,
  bankCode: '341',
  agency: '4321',
  agencyDigit: '0',
  accountNumber: `11223${n}`,
  accountDigit: '4',
  accountAgencyDigit: ' ',
});

const payment = (n: number, valueCents: number): RemittancePayment => ({
  payee: payee(n),
  paymentDate: new Date(Date.UTC(2026, 7, 12)),
  valueCents,
});

const base = {
  cedente: CEDENTE,
  bankName: 'BRADESCO',
  nsa: 7,
  generatedAt: new Date(Date.UTC(2026, 7, 10, 14, 5, 9)),
  serviceType: '20',
  launchForm: '01',
};

const at = (line: string, from: number, to: number): string => line.slice(from - 1, to);

const build = (payments: readonly RemittancePayment[]) => {
  const r = buildRemittanceFile({ ...base, payments });
  assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
  return r.value;
};

const linesOf = (content: string): readonly string[] => content.split(LINE_TERMINATOR);

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

  it('declara um lote', () => {
    const file = build([payment(1, 100)]);
    const lines = linesOf(file.content);
    assert.equal(Number(at(lines[lines.length - 1] ?? '', 18, 23)), 1);
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

  it('propaga o erro de um pagamento sem emitir arquivo parcial', () => {
    const r = buildRemittanceFile({
      ...base,
      payments: [payment(1, 100), { ...payment(2, 100), valueCents: 10 ** 16 }],
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'numeric-field-overflow');
  });
});
