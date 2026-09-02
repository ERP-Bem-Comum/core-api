import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { resolveBarcode } from '#src/modules/financial/domain/payout/digitable-line.ts';

// ⚠️ TODOS os valores aqui são SINTÉTICOS — montados a partir de um código de barras inventado,
// com os DVs calculados pela própria regra FEBRABAN. Nenhum boleto real entra em fixture: os três
// repositórios são públicos, e linha digitável identifica cedente, valor e vencimento.
//
// Fonte da montagem: FEBRABAN, "Layout Padrão de Arrecadação/Recebimento com Utilização do Código
// de Barras", versão 7 de 01/03/2023 — §07 (DAC módulo 10), §09 (DAC módulo 11) e §"E" da seção 03
// ("representação numérica […] em campos de 11 posições […] acrescido de 1 dígito verificador […]
// Os dígitos verificadores não estarão representados no Código de Barras").

// --- COBRANÇA (47) -------------------------------------------------------------------------
// barcode: 1-3 banco | 4 moeda | 5 DV geral | 6-9 fator vencimento | 10-19 valor | 20-44 campo livre
const BARCODE_COBRANCA = '23795123400000150001234567890123456789012345';
const LINHA_COBRANCA = '23791234546789012345767890123457512340000015000';

// --- ARRECADAÇÃO (48) ----------------------------------------------------------------------
// 4 blocos de 11 + 1 DV cada. Identificador de valor "6" => DV de bloco por módulo 10.
const BARCODE_ARRECADACAO = '83650000001500012345678901234567890123456789';
const LINHA_ARRECADACAO = '836500000010500012345673890123456786901234567898';

const unwrap = (r: ReturnType<typeof resolveBarcode>): string => {
  assert.equal(r.ok, true, `esperava conversão bem-sucedida, veio ${r.ok ? '' : r.error}`);
  return r.ok ? r.value : '';
};

describe('resolveBarcode — código de barras já pronto', () => {
  it('devolve os 44 dígitos inalterados', () => {
    assert.equal(unwrap(resolveBarcode(BARCODE_COBRANCA)), BARCODE_COBRANCA);
  });
});

describe('resolveBarcode — linha digitável de COBRANÇA (47)', () => {
  // CA1: o arquivo grava os 44 dígitos correspondentes no G063.
  it('converte para o código de barras equivalente', () => {
    assert.equal(unwrap(resolveBarcode(LINHA_COBRANCA)), BARCODE_COBRANCA);
  });

  // CA4: os bytes gravados a partir da linha digitável são IDÊNTICOS aos gravados a partir do
  // código de barras equivalente. É o critério que impede a conversão de "quase" funcionar.
  it('produz exatamente os mesmos bytes que o código de barras equivalente', () => {
    assert.equal(unwrap(resolveBarcode(LINHA_COBRANCA)), unwrap(resolveBarcode(BARCODE_COBRANCA)));
  });

  it('preserva o DV geral, que muda de lugar e não de valor', () => {
    // Linha 33 (1-indexed) => barcode 5. A conversão NÃO recalcula DV nenhum: reordena.
    assert.equal(unwrap(resolveBarcode(LINHA_COBRANCA))[4], LINHA_COBRANCA[32]);
  });

  // CA2: DV de campo que não confere é DADO ERRADO, não formato não suportado.
  it('recusa quando um DV de campo não confere', () => {
    const wrongDigit = LINHA_COBRANCA[9] === '9' ? '8' : '9';
    const corrupted = LINHA_COBRANCA.slice(0, 9) + wrongDigit + LINHA_COBRANCA.slice(10);
    const r = resolveBarcode(corrupted);
    assert.equal(r.ok, false);
    assert.equal(r.ok ? '' : r.error, 'field-check-digit-mismatch');
  });
});

describe('resolveBarcode — linha digitável de ARRECADAÇÃO (48)', () => {
  // A #788 registra que guia (DARF, GPS, concessionária) tem 48 e caía em `malformed` — dado
  // certo, tratado como erro do operador.
  it('converte removendo o DV de cada um dos quatro blocos', () => {
    assert.equal(unwrap(resolveBarcode(LINHA_ARRECADACAO)), BARCODE_ARRECADACAO);
  });

  it('recusa quando o DV de um bloco não confere', () => {
    const wrongDigit = LINHA_ARRECADACAO[11] === '9' ? '8' : '9';
    const corrupted = LINHA_ARRECADACAO.slice(0, 11) + wrongDigit + LINHA_ARRECADACAO.slice(12);
    const r = resolveBarcode(corrupted);
    assert.equal(r.ok, false);
    assert.equal(r.ok ? '' : r.error, 'field-check-digit-mismatch');
  });
});

describe('resolveBarcode — comprimentos que não são nenhum dos três', () => {
  it('recusa como comprimento desconhecido', () => {
    for (const detail of ['', '123', '34191790010', '9'.repeat(50), '9'.repeat(45)]) {
      const r = resolveBarcode(detail);
      assert.equal(r.ok, false, detail);
      assert.equal(r.ok ? '' : r.error, 'unknown-length', detail);
    }
  });
});
