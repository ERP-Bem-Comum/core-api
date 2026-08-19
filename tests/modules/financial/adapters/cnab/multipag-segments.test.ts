import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: os segmentos de detalhe (A e B) do Multipag ainda não existem.
import {
  segmentA,
  segmentB,
  paymentRecords,
  type Payee,
} from '#src/modules/financial/adapters/cnab/multipag-segments.ts';

const PAYEE: Payee = {
  name: 'FORNECEDOR EXEMPLO LTDA',
  documentType: '2',
  document: '98765432000111',
  bankCode: '341',
  agency: '4321',
  agencyDigit: '0',
  accountNumber: '112233',
  accountDigit: '4',
  accountAgencyDigit: ' ',
};

const PAY_DATE = new Date(Date.UTC(2026, 7, 12));

// Campo do CNAB é 1-indexed e inclusivo nas duas pontas — o helper fala a língua do layout.
const at = (line: string, from: number, to: number): string => line.slice(from - 1, to);

const line = (r: ReturnType<typeof segmentA>): string => {
  assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
  return r.value;
};

// P001 — a câmara é EXIGIDA do chamador desde a #751. O valor aqui é o de TED porque o favorecido
// da fixture é de outro banco (341 ≠ 237); quem deriva o par forma↔câmara é `batch-profile.ts`.
const TED_CLEARING = '018';

const baseA = {
  bankCode: '237',
  batchNumber: 1,
  recordNumber: 1,
  payee: PAYEE,
  paymentDate: PAY_DATE,
  valueCents: 123456,
  clearingHouse: TED_CLEARING,
};

describe('Multipag — Segmento A (pagamento)', () => {
  const record = line(segmentA(baseA));

  it('tem exatamente 240 posições', () => {
    assert.equal(record.length, 240);
  });

  it('identifica-se como detalhe do lote, com o sequencial e a letra A', () => {
    assert.equal(at(record, 1, 3), '237');
    assert.equal(at(record, 4, 7), '0001');
    assert.equal(at(record, 8, 8), '3');
    assert.equal(at(record, 9, 13), '00001');
    assert.equal(at(record, 14, 14), 'A');
  });

  it('leva o banco, a agência e a conta do FAVORECIDO — não os do cedente', () => {
    assert.equal(at(record, 21, 23), '341');
    assert.equal(at(record, 24, 28), '04321');
    assert.equal(at(record, 29, 29), '0');
    assert.equal(at(record, 30, 41), '000000112233');
    assert.equal(at(record, 42, 42), '4');
  });

  it('leva nome do favorecido, data e valor do pagamento', () => {
    assert.equal(at(record, 44, 73), 'FORNECEDOR EXEMPLO LTDA       ');
    assert.equal(at(record, 94, 101), '12082026');
    assert.equal(at(record, 120, 134), '000000000123456');
  });

  it('zera os campos que só o RETORNO preenche (data real e valor real)', () => {
    assert.equal(at(record, 155, 162), '00000000');
    assert.equal(at(record, 163, 177), '000000000000000');
  });

  it('declara a moeda em real', () => {
    assert.equal(at(record, 102, 104), 'BRL');
  });

  // #751/CA4. Enquanto a câmara teve default, o valor de TED valia para TODO pagamento — inclusive
  // para o favorecido do próprio banco, cujo registro o Bradesco recusa. O campo passou a ser
  // exigido: o segmento escreve o que recebeu, e não tem opinião sobre qual câmara é a certa.
  it('escreve a câmara que recebeu, sem valor por omissão', () => {
    assert.equal(at(record, 18, 20), TED_CLEARING);
    assert.equal(at(line(segmentA({ ...baseA, clearingHouse: '000' })), 18, 20), '000');
  });

  // Um valor que não cabe é recusado — truncar pagaria outro valor, e o banco aceitaria.
  it('recusa valor que estoura o campo, em vez de truncar', () => {
    const r = segmentA({ ...baseA, valueCents: 10 ** 16 });
    assert.ok(isErr(r));
    assert.equal(r.error, 'numeric-field-overflow');
  });

  // Teto do lote (#711/CA8). O sequencial do registro tem 5 posições — 99.999 registros de
  // detalhe, e como cada pagamento gera o par A+B, ~49.999 pagamentos por lote. É o gargalo
  // real: as contagens dos trailers têm 6 dígitos e só estourariam depois.
  //
  // Nenhuma remessa realista da operação chega perto disso. O teste existe porque o modo de
  // falha importa: um sequencial truncado produziria arquivo que o banco ACEITA, com dois
  // registros disputando a mesma posição no lote.
  it('recusa o registro que passa do teto de 99.999 do lote, em vez de truncar', () => {
    assert.ok(isOk(segmentA({ ...baseA, recordNumber: 99_999 })), 'o teto ainda cabe');

    const r = segmentA({ ...baseA, recordNumber: 100_000 });
    assert.ok(isErr(r));
    assert.equal(r.error, 'numeric-field-overflow');
  });
});

describe('Multipag — Segmento B (dados complementares do favorecido)', () => {
  const record = line(
    segmentB({
      bankCode: '237',
      batchNumber: 1,
      recordNumber: 2,
      payee: PAYEE,
      address: {
        street: 'RUA DAS FLORES',
        number: 100,
        district: 'CENTRO',
        city: 'FORTALEZA',
        zipCode: '60000',
        zipSuffix: '000',
        state: 'CE',
      },
    }),
  );

  it('tem exatamente 240 posições', () => {
    assert.equal(record.length, 240);
  });

  it('identifica-se como detalhe do lote com a letra B', () => {
    assert.equal(at(record, 8, 8), '3');
    assert.equal(at(record, 9, 13), '00002');
    assert.equal(at(record, 14, 14), 'B');
  });

  it('carrega a inscrição do favorecido — o que o A não tem espaço para levar', () => {
    assert.equal(at(record, 18, 18), '2');
    assert.equal(at(record, 19, 32), '98765432000111');
  });

  it('carrega o endereço do favorecido nas posições do layout', () => {
    assert.equal(at(record, 33, 62), 'RUA DAS FLORES                ');
    assert.equal(at(record, 63, 67), '00100');
    assert.equal(at(record, 98, 117), 'FORTALEZA           ');
    assert.equal(at(record, 118, 122), '60000');
    assert.equal(at(record, 126, 127), 'CE');
  });

  it('funciona sem endereço — o layout aceita brancos, e o domínio pode não ter o dado', () => {
    const r = segmentB({ bankCode: '237', batchNumber: 1, recordNumber: 2, payee: PAYEE });
    assert.equal(line(r).length, 240);
  });

  // Documento vindo do ETL legado pode carregar máscara; a ACL traduz o formato em vez de recusar
  // a remessa inteira por causa de um ponto.
  it('aceita CNPJ mascarado e produz o mesmo registro que o sem máscara', () => {
    const masked = line(
      segmentB({
        bankCode: '237',
        batchNumber: 1,
        recordNumber: 2,
        payee: { ...PAYEE, document: '98.765.432/0001-11' },
      }),
    );
    const plain = line(
      segmentB({ bankCode: '237', batchNumber: 1, recordNumber: 2, payee: PAYEE }),
    );

    assert.equal(at(masked, 19, 32), '98765432000111');
    assert.equal(masked, plain);
  });
});

describe('Multipag — o par A+B de um pagamento', () => {
  it('emite A e B em sequência, numerados a partir do registro informado', () => {
    const r = paymentRecords({
      bankCode: '237',
      batchNumber: 1,
      firstRecordNumber: 5,
      payee: PAYEE,
      paymentDate: PAY_DATE,
      valueCents: 5000,
      clearingHouse: TED_CLEARING,
    });
    assert.ok(isOk(r));
    const [a, b] = r.value;

    assert.equal(r.value.length, 2);
    assert.equal(at(a ?? '', 14, 14), 'A');
    assert.equal(at(b ?? '', 14, 14), 'B');
    assert.equal(at(a ?? '', 9, 13), '00005');
    assert.equal(at(b ?? '', 9, 13), '00006');
    assert.ok(r.value.every((rec) => rec.length === 240));
  });

  // O B é obrigatório no Multipag (layout p.25). Emitir só o A é o erro que a transcrição
  // da knowledge base induzia ao marcá-lo como opcional.
  it('nunca emite o A sozinho', () => {
    const r = paymentRecords({
      bankCode: '237',
      batchNumber: 1,
      firstRecordNumber: 1,
      payee: PAYEE,
      paymentDate: PAY_DATE,
      valueCents: 1,
      clearingHouse: TED_CLEARING,
    });
    assert.ok(isOk(r));
    assert.equal(r.value.length, 2);
  });

  it('propaga o erro do A sem emitir o B', () => {
    const r = paymentRecords({
      bankCode: '237',
      batchNumber: 1,
      firstRecordNumber: 1,
      payee: { ...PAYEE, document: 'nao-e-numero' },
      paymentDate: PAY_DATE,
      valueCents: 1,
      clearingHouse: TED_CLEARING,
    });
    assert.ok(isErr(r));
  });
});
