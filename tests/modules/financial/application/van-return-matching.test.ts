// Os critérios de aceite da #690 — casamento do retorno e segregação do que não é nosso.
//
// A função é pura, então estes testes não simulam bucket nem banco: montam registros já lidos e os
// vínculos já consultados, e afirmam os baldes. O que exige storage é a fatia do efeito.
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import {
  matchReturnPayments,
  returnPaymentKey,
} from '#src/modules/financial/application/van-return-matching.ts';
import type { ReturnPayment } from '#src/modules/financial/application/ports/van-return-reader.ts';
import type { RemittanceDocumentRef } from '#src/modules/financial/application/ports/van-return-match-reader.ts';

const payment = (over: Partial<ReturnPayment> = {}): ReturnPayment => ({
  line: 3,
  batch: '0001',
  yourNumber: '00000000000100000001',
  bankNumber: 'BANCO000000000000001',
  settledAt: '2026-08-19',
  settledValueCents: 12345,
  occurrences: ['00'],
  outcome: 'settled',
  ...over,
});

const ref = (yourNumber: string): RemittanceDocumentRef => ({
  yourNumber,
  remittanceId: '11111111-1111-4111-8111-111111111111',
  documentId: '22222222-2222-4222-8222-222222222222',
  fileName: 'PAG_000000.19082026120000_000001.REM',
});

describe('matchReturnPayments — CA1: o desconhecido não derruba os conhecidos', () => {
  it('lote com 3 registros, 1 sem correspondência: 2 processados, 1 segregado, lote NÃO falha', () => {
    const a = payment({ line: 3, yourNumber: 'REF-A' });
    const b = payment({ line: 4, yourNumber: 'REF-B' });
    const alheio = payment({ line: 5, yourNumber: 'REF-DE-OUTRO-CONVENIO' });

    const r = matchReturnPayments([a, b, alheio], [ref('REF-A'), ref('REF-B')]);

    assert.equal(r.matched.length, 2);
    assert.deepEqual(
      r.matched.map((m) => m.payment.yourNumber),
      ['REF-A', 'REF-B'],
    );
    assert.equal(r.segregated.length, 1);
    assert.equal(r.segregated[0]?.reason, 'unknown-reference');
    assert.equal(r.batchFailed, false, 'referência desconhecida NUNCA falha o lote');
  });

  it('o vínculo casado viaja junto — dá para dizer de qual remessa aquilo veio', () => {
    const r = matchReturnPayments([payment({ yourNumber: 'REF-A' })], [ref('REF-A')]);

    assert.equal(r.matched[0]?.ref.documentId, '22222222-2222-4222-8222-222222222222');
    assert.equal(r.matched[0]?.ref.fileName, 'PAG_000000.19082026120000_000001.REM');
  });
});

describe('matchReturnPayments — CA2: nenhum casa, e ainda assim o lote não falha', () => {
  it('todos segregados, nenhum perdido, `batchFailed` continua falso', () => {
    const tres = [
      payment({ line: 3, yourNumber: 'X1' }),
      payment({ line: 4, yourNumber: 'X2' }),
      payment({ line: 5, yourNumber: 'X3' }),
    ];

    const r = matchReturnPayments(tres, []);

    assert.deepEqual(r.matched, []);
    assert.equal(r.segregated.length, 3, 'nenhum registro some');
    assert.equal(r.batchFailed, false);
  });

  it('lista de vínculos vazia não é o mesmo que arquivo vazio', () => {
    const r = matchReturnPayments([], []);
    assert.deepEqual(r.matched, []);
    assert.deepEqual(r.segregated, []);
    assert.equal(r.batchFailed, false);
  });
});

describe('matchReturnPayments — CA3: por que não casou, com ação distinta em cada caso', () => {
  it('sem `Seu Número` é `no-reference` — não se confunde com referência desconhecida', () => {
    // Ou é operação de fora da integração (normal, nada a fazer), ou o emissor mandou o campo em
    // branco (defeito NOSSO). Agregar ao balde genérico esconderia o segundo.
    const r = matchReturnPayments([payment({ yourNumber: '' })], []);

    assert.equal(r.segregated[0]?.reason, 'no-reference');
    assert.equal(r.segregated[0]?.bankNumber, 'BANCO000000000000001', 'ainda dá para nomeá-lo');
  });

  it('referência presente e não nossa é `unknown-reference`', () => {
    const r = matchReturnPayments([payment({ yourNumber: 'NAO-E-NOSSA' })], [ref('OUTRA')]);

    assert.equal(r.segregated[0]?.reason, 'unknown-reference');
    assert.equal(
      r.segregated[0]?.yourNumber,
      'NAO-E-NOSSA',
      'a referência lida acompanha o motivo',
    );
  });

  it('linha que nem virou registro é `unreadable`, e entra no MESMO relatório', () => {
    // Deixá-la de fora faria o relatório contar menos registros do que o arquivo tem — e a
    // diferença sumiria sem ninguém notar.
    const r = matchReturnPayments([payment({ yourNumber: 'REF-A' })], [ref('REF-A')], [7, 9]);

    assert.equal(r.matched.length, 1);
    assert.deepEqual(
      r.segregated.map((s) => [s.reason, s.line]),
      [
        ['unreadable', 7],
        ['unreadable', 9],
      ],
    );
    assert.equal(r.batchFailed, false);
  });

  it('os três motivos coexistem sem se contaminar', () => {
    const r = matchReturnPayments(
      [
        payment({ line: 3, yourNumber: 'REF-A' }),
        payment({ line: 4, yourNumber: '' }),
        payment({ line: 5, yourNumber: 'ALHEIA' }),
      ],
      [ref('REF-A')],
      [9],
    );

    assert.equal(r.matched.length, 1);
    assert.deepEqual(
      r.segregated.map((s) => s.reason),
      ['no-reference', 'unknown-reference', 'unreadable'],
    );
    // Nada some: todo registro lido termina em algum balde, e as linhas ilegíveis também.
    assert.equal(r.matched.length + r.segregated.length, 4);
  });
});

describe('returnPaymentKey — a chave de negócio que sustenta o CA6', () => {
  it('prefere a NOSSA referência, que é única por construção', () => {
    assert.equal(returnPaymentKey(payment({ yourNumber: 'REF-A' })), 'your:REF-A');
  });

  it('cai para a referência do banco quando a nossa falta', () => {
    assert.equal(returnPaymentKey(payment({ yourNumber: '', bankNumber: 'BCO-9' })), 'bank:BCO-9');
  });

  it('sem nenhuma das duas, usa a linha — pior chave, melhor que colapsar registros distintos', () => {
    const semNada = payment({ yourNumber: '', bankNumber: '', line: 42 });
    assert.equal(returnPaymentKey(semNada), 'line:42');
  });

  it('registros distintos sem referência nenhuma NÃO colapsam numa chave só', () => {
    const a = payment({ yourNumber: '', bankNumber: '', line: 10 });
    const b = payment({ yourNumber: '', bankNumber: '', line: 11 });
    assert.notEqual(returnPaymentKey(a), returnPaymentKey(b));
  });
});

describe('matchReturnPayments — idempotência da classificação (CA6, na parte que esta fatia decide)', () => {
  it('reprocessar o MESMO arquivo produz exatamente os mesmos baldes e as mesmas chaves', () => {
    const entrada = [
      payment({ line: 3, yourNumber: 'REF-A' }),
      payment({ line: 4, yourNumber: '' }),
      payment({ line: 5, yourNumber: 'ALHEIA' }),
    ];
    const vinculos = [ref('REF-A')];

    const primeira = matchReturnPayments(entrada, vinculos, [9]);
    const segunda = matchReturnPayments(entrada, vinculos, [9]);

    assert.deepEqual(segunda, primeira);
    assert.deepEqual(
      segunda.matched.map((m) => returnPaymentKey(m.payment)),
      primeira.matched.map((m) => returnPaymentKey(m.payment)),
    );
  });

  // ⚠️ O que esta fatia NÃO prova: que o EFEITO não se repete. Não baixar duas vezes um título já
  // baixado depende de persistir a chave de negócio, e é a fatia seguinte. Declarado aqui para o
  // verde não ser lido como "CA6 fechado".
  it('a ordem de entrada é preservada — o relatório é comparável entre execuções', () => {
    const r = matchReturnPayments(
      [payment({ line: 5, yourNumber: 'B' }), payment({ line: 3, yourNumber: 'A' })],
      [ref('A'), ref('B')],
    );

    assert.deepEqual(
      r.matched.map((m) => m.payment.line),
      [5, 3],
      'a função não reordena — quem ordena é quem apresenta',
    );
  });
});
