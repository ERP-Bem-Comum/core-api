import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import { createBradescoMultipagTranslator } from '#src/modules/financial/adapters/cnab/bradesco-multipag-translator.ts';
import { inspectRemittanceFile } from '#src/modules/financial/adapters/cnab/remittance-inspector.ts';
import type {
  RemittanceCedenteData,
  RemittancePaymentInput,
  TranslateRemittanceInput,
} from '#src/modules/financial/application/ports/cnab-remittance-translator.ts';

// O tradutor não tinha suíte própria até a #804, e o que ficava descoberto era justamente o
// MAPEAMENTO DE ERRO: o montador distingue nove causas de recusa, e o tradutor as achatava num
// `cnab-translation-failed` genérico com um ternário. Quem recebe "falhou a tradução" não sabe se
// deve conferir o cadastro do convênio, o banco do favorecido ou a seleção de títulos.

const CEDENTE: RemittanceCedenteData = {
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
  bankName: 'BRADESCO',
};

const PAYEE = {
  name: 'FORNECEDOR EXEMPLO LTDA',
  documentType: '2',
  document: '98765432000111',
  bankCode: '341',
  agency: '4321',
  agencyDigit: '0',
  accountNumber: '112233',
  accountDigit: '4',
} as const;

const PAYMENT: RemittancePaymentInput = {
  route: 'transfer',
  payee: PAYEE,
  valueCents: 123456,
  paymentDate: new Date(Date.UTC(2026, 7, 12)),
};

const translate = (over: Partial<TranslateRemittanceInput> = {}) =>
  createBradescoMultipagTranslator().translate({
    cedente: CEDENTE,
    nsa: 42,
    generatedAt: new Date(Date.UTC(2026, 7, 10, 14, 5, 9)),
    payments: [PAYMENT],
    ...over,
  });

describe('Tradutor Multipag — o caminho feliz', () => {
  it('traduz uma seleção válida em arquivo, nome e referências', () => {
    const r = translate();
    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
    assert.equal(r.value.batchCount, 1);
    assert.equal(r.value.lineCount, 6);
    assert.equal(r.value.totalCents, 123456);
    assert.equal(r.value.yourNumbers.length, 1);
  });

  // O emissor passou a terminar TODA linha em CRLF (#804, defeito 6). A conta em bytes é a única
  // testemunha honesta: `split` desfaria o mesmo erro que o montador poderia cometer.
  it('entrega conteúdo com terminador em todos os registros', () => {
    const r = translate();
    assert.ok(isOk(r));
    assert.equal(r.value.content.length, (240 + 2) * r.value.lineCount);
  });

  // #862, CA4. Este é o caso ponta a ponta que a primitiva sozinha não prova: o tradutor roda o
  // `inspectRemittanceFile` internamente e transforma qualquer defeito em `cnab-malformed-file` —
  // então um `º` que sobrevivesse a `alpha()` chegaria ao operador como recusa da remessa INTEIRA,
  // sem apontar campo, e com o NSA já consumido lá atrás por `generate-remittance`.
  //
  // A asserção é dupla de propósito: `isOk` prova que a remessa é gerada, e o inspetor devolvendo
  // `[]` prova que ela é gerada LIMPA — não que o defeito foi tolerado em algum lugar.
  it('gera arquivo limpo com favorecido cuja razão social tem não-ASCII', () => {
    const r = translate({
      payments: [{ ...PAYMENT, payee: { ...PAYEE, name: 'ACOUGUE Nº 12 – CENTRO LTDA' } }],
    });

    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
    assert.deepEqual(inspectRemittanceFile(r.value.content), []);
    assert.ok(
      r.value.content.includes('ACOUGUE NO 12 - CENTRO LTDA'),
      'o nome tem de chegar ao banco legível, não apagado',
    );
  });
});

describe('Tradutor Multipag — cada recusa chega com nome próprio', () => {
  // #804. O convênio ausente e o convênio longo são causas DIFERENTES, com ações diferentes de
  // quem corrige: um manda cadastrar, o outro manda conferir o que o banco cadastrou. Achatar os
  // dois em `cnab-translation-failed` mandaria o operador procurar no lugar errado.
  it('distingue convênio ausente de convênio que não cabe', () => {
    const missing = translate({ cedente: { ...CEDENTE, convenio: '  ' } });
    assert.ok(isErr(missing));
    assert.equal(missing.error, 'cnab-convenio-missing');

    const tooLong = translate({ cedente: { ...CEDENTE, convenio: '0000001' } });
    assert.ok(isErr(tooLong));
    assert.equal(tooLong.error, 'cnab-convenio-overflow');
  });

  // A rota sem emissor já tinha nome próprio antes da #804, e continua tendo: o `switch` que
  // substituiu o ternário preserva o mapeamento, não o reescreve.
  it('mantém o nome próprio da rota sem emissor', () => {
    const r = translate({
      // `tax-guide`, e não `pix`: desde a #838 o Pix TEM emissor, e usá-lo aqui mediria a rota
      // errada — o teste passaria a exercitar a montagem, não a recusa que ele existe para fixar.
      payments: [
        { route: 'tax-guide', valueCents: 100, paymentDate: new Date(Date.UTC(2026, 7, 12)) },
      ],
    });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cnab-launch-form-unsupported');
  });

  it('recusa seleção vazia sem gerar envelope', () => {
    const r = translate({ payments: [] });
    assert.ok(isErr(r));
    assert.equal(r.error, 'cnab-translation-failed');
  });
});
