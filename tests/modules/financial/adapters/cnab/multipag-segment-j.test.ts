import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: o Segmento J (pagamento de título de cobrança) ainda não existe.
import { segmentJ } from '#src/modules/financial/adapters/cnab/multipag-segments.ts';

/**
 * Segmento J — Pagamento de Títulos de Cobrança (boleto).
 *
 * Fonte primária: `jun-19-layout-multipag.pdf` p. 32 (local-only), campos 01.3J a 21.3J. Declarado
 * **Obrigatório – Remessa / Retorno**.
 *
 * ⚠️ O que este registro NÃO tem, e é o ponto: nenhum campo de agência, conta ou banco do
 * FAVORECIDO. Quem identifica o beneficiário é o código de barras. É a confirmação, na fonte, do
 * CA5 da #708 — "boleto e guia não carregam agência/conta do favorecido" — e a razão pela qual
 * 38% dos títulos do dump de produção não dependem do cadastro bancário para serem pagos.
 *
 * O `Nome do Cedente` (62-91) é de quem RECEBE — cedente, em cobrança, é quem emitiu o título. A
 * mesma posição, na seção de PIX do manual (p. 41), chama-se "Nome do Beneficiário". O que o
 * registro não carrega é o dado BANCÁRIO do favorecido, não o nome dele.
 */

const AT = (iso: string): Date => new Date(iso);

const BASE = {
  bankCode: '237',
  batchNumber: 1,
  recordNumber: 1,
  // 44 dígitos — o formato que o campo G063 exige (Carta-Circular Bacen 2.926).
  barcode: '23791234500000150000123456789012345678901234',
  // Quem RECEBE. Usar aqui o nome da própria organização faria a fixture descrever o campo errado.
  beneficiaryName: 'FORNECEDOR EXEMPLO LTDA',
  dueDate: AT('2026-08-20T00:00:00Z'),
  titleValueCents: 15_000,
  paymentDate: AT('2026-08-14T00:00:00Z'),
  paymentValueCents: 15_000,
};

const line = (r: ReturnType<typeof segmentJ>): string => {
  assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
  return r.value;
};

// Posições do layout são 1-based e inclusivas nas duas pontas.
const at = (s: string, from: number, to: number): string => s.slice(from - 1, to);

describe('Multipag — Segmento J (pagamento de título de cobrança)', () => {
  const record = line(segmentJ(BASE));

  it('tem exatamente 240 posições', () => {
    assert.equal(record.length, 240);
  });

  it('identifica-se como detalhe do lote, com o sequencial e a letra J', () => {
    assert.equal(at(record, 1, 3), '237'); // 01.3J banco do cedente
    assert.equal(at(record, 4, 7), '0001'); // 02.3J lote
    assert.equal(at(record, 8, 8), '3'); // 03.3J tipo de registro (detalhe)
    assert.equal(at(record, 9, 13), '00001'); // 04.3J sequencial no lote
    assert.equal(at(record, 14, 14), 'J'); // 05.3J segmento
  });

  it('declara movimento de inclusão sem instrução', () => {
    assert.equal(at(record, 15, 15), '0'); // 06.3J tipo de movimento
    assert.equal(at(record, 16, 17), '00'); // 07.3J código da instrução
  });

  // O campo central: 44 posições numéricas, 18-61.
  it('grava o código de barras nas posições 018-061', () => {
    assert.equal(at(record, 18, 61), BASE.barcode);
    assert.equal(at(record, 18, 61).length, 44);
  });

  it('grava o nome do cedente — quem recebe — alinhado à esquerda em 30 posições', () => {
    assert.equal(at(record, 62, 91), 'FORNECEDOR EXEMPLO LTDA'.padEnd(30, ' '));
  });

  it('grava as duas datas em DDMMAAAA', () => {
    assert.equal(at(record, 92, 99), '20082026'); // 10.3J vencimento
    assert.equal(at(record, 145, 152), '14082026'); // 14.3J pagamento
  });

  // Valores são 13 inteiros + 2 decimais = 15 posições, sem separador.
  it('grava os valores em centavos, com 15 posições', () => {
    assert.equal(at(record, 100, 114), '000000000015000'); // 11.3J valor do título
    assert.equal(at(record, 153, 167), '000000000015000'); // 15.3J valor do pagamento
  });

  it('zera desconto e acréscimos quando não informados', () => {
    assert.equal(at(record, 115, 129), '0'.repeat(15)); // 12.3J desconto
    assert.equal(at(record, 130, 144), '0'.repeat(15)); // 13.3J acréscimos
  });

  it('declara a moeda como Real', () => {
    assert.equal(at(record, 168, 182), '0'.repeat(15)); // 16.3J quantidade da moeda
    assert.equal(at(record, 223, 224), '09'); // 19.3J código da moeda — '09' = Real
  });

  it('deixa em branco o que o banco preenche no retorno', () => {
    assert.equal(at(record, 203, 222), ' '.repeat(20)); // 18.3J nosso número
    assert.equal(at(record, 225, 230), ' '.repeat(6)); // 20.3J CNAB
    assert.equal(at(record, 231, 240), ' '.repeat(10)); // 21.3J ocorrências
  });
});

describe('Segmento J — campos opcionais do pagador', () => {
  it('aceita desconto e acréscimos quando informados', () => {
    const r = line(segmentJ({ ...BASE, discountCents: 500, surchargeCents: 250 }));
    assert.equal(at(r, 115, 129), '000000000000500');
    assert.equal(at(r, 130, 144), '000000000000250');
  });

  it('aceita a referência do pagador em 20 posições', () => {
    const r = line(segmentJ({ ...BASE, yourNumber: 'NF-1234' }));
    assert.equal(at(r, 183, 202), 'NF-1234'.padEnd(20, ' '));
  });

  it('deixa a referência em branco quando ausente', () => {
    assert.equal(at(line(segmentJ(BASE)), 183, 202), ' '.repeat(20));
  });
});

describe('Segmento J — o que é recusado em vez de truncado', () => {
  // Mesma disciplina do Segmento A: campo numérico que não cabe é ERRO. Um código de barras
  // truncado produz arquivo que o banco aceita e paga o título errado.
  it('recusa código de barras que não tem 44 dígitos', () => {
    for (const barcode of ['123', '2379123450000015000012345678901234567890123456']) {
      const r = segmentJ({ ...BASE, barcode });
      assert.ok(isErr(r), barcode);
    }
  });

  it('recusa código de barras com caractere não numérico', () => {
    const r = segmentJ({ ...BASE, barcode: '2379123450000015000012345678901234567890123X' });
    assert.ok(isErr(r));
  });

  it('recusa valor que estoura o campo', () => {
    assert.ok(isErr(segmentJ({ ...BASE, paymentValueCents: 10 ** 16 })));
  });

  it('recusa sequencial acima do teto do lote', () => {
    assert.ok(isOk(segmentJ({ ...BASE, recordNumber: 99_999 })));
    assert.ok(isErr(segmentJ({ ...BASE, recordNumber: 100_000 })));
  });
});
