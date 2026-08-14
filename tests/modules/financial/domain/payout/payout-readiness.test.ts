import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { checkPayoutReadiness } from '#src/modules/financial/domain/payout/payout-readiness.ts';
import { decomposePayeeAccount } from '#src/modules/financial/domain/payout/payee-account.ts';
import type {
  PayeePaymentTarget,
  PayoutCandidate,
  PayoutGap,
  PayoutReadiness,
} from '#src/modules/financial/domain/payout/types.ts';
import type { PaymentMethod } from '#src/modules/financial/domain/document/types.ts';

const EMPTY_TARGET: PayeePaymentTarget = {
  bank: null,
  agency: null,
  accountNumber: null,
  checkDigit: null,
  pixKey: null,
};

const target = (patch: Partial<PayeePaymentTarget>): PayeePaymentTarget => ({
  ...EMPTY_TARGET,
  ...patch,
});

// Conta estruturada COMPLETA: o único arranjo que o segmento A aceita sem inventar campo.
const fullAccount = (): PayeePaymentTarget =>
  target({ bank: '237', agency: '1234-5', accountNumber: '123456', checkDigit: '7' });

const candidate = (patch: Partial<PayoutCandidate>): PayoutCandidate => ({
  paymentMethod: 'TED',
  paymentDetail: null,
  payee: EMPTY_TARGET,
  ...patch,
});

const gapsOf = (r: PayoutReadiness): readonly PayoutGap[] =>
  r.status === 'incomplete' ? r.gaps : [];

const fieldsOf = (r: PayoutReadiness): readonly string[] => gapsOf(r).map((g) => g.field);

const reasonFor = (r: PayoutReadiness, field: string): string | undefined =>
  gapsOf(r).find((g) => g.field === field)?.reason;

describe('checkPayoutReadiness — a forma de pagamento decide o que o arquivo exige', () => {
  // O reenquadramento da P.O. (issue #708): elegibilidade é por forma do título, não por
  // "favorecido com banco completo". Boleto e PIX não olham a conta estruturada.
  it('roteia cada forma para a rota da VAN correspondente', () => {
    const routes: readonly (readonly [PaymentMethod, string])[] = [
      ['PIX', 'pix'],
      ['TED', 'transfer'],
      ['TransferenciaBancaria', 'transfer'],
      ['Boleto', 'billet'],
      ['GuiaRecolhimento', 'tax-guide'],
    ];
    for (const [paymentMethod, route] of routes) {
      const r = checkPayoutReadiness(candidate({ paymentMethod }));
      assert.notEqual(r.status, 'out-of-van', `${paymentMethod} deveria estar na VAN`);
      assert.equal(r.status === 'out-of-van' ? null : r.route, route, paymentMethod);
    }
  });

  // Câmbio e cartão corporativo não são contratados na VAN — recusar é diferente de "incompleto":
  // nenhum cadastro conserta, então oferecer campo a preencher seria mentir para o operador.
  it('marca as formas fora da VAN sem apontar campo faltante', () => {
    for (const paymentMethod of ['CartaoCorporativo', 'Cambio', 'Outro'] as const) {
      const r = checkPayoutReadiness(candidate({ paymentMethod, payee: fullAccount() }));
      assert.equal(r.status, 'out-of-van', paymentMethod);
      assert.equal(r.status === 'out-of-van' ? r.paymentMethod : null, paymentMethod);
    }
  });
});

describe('checkPayoutReadiness — PIX exige a chave, e só a chave', () => {
  it('aprova PIX com chave mesmo sem nenhum dado bancário', () => {
    const r = checkPayoutReadiness(
      candidate({
        paymentMethod: 'PIX',
        payee: target({ pixKey: { keyType: 'email', key: 'a@b.com' } }),
      }),
    );
    assert.equal(r.status, 'ready');
  });

  // O `keyType` NÃO participa da decisão de aptidão — ele viaja para quem emite o registro. Um
  // tipo desconhecido aqui não pode reprovar o título: quem valida o conjunto de tipos é
  // `partners`, no `createPixKey`, e duplicar essa lista seria criar a segunda fonte da verdade.
  it('não julga o tipo da chave, apenas a existência dela', () => {
    for (const keyType of ['email', 'cpf', 'random-key', 'algo-que-partners-ainda-nao-tem']) {
      const r = checkPayoutReadiness(
        candidate({ paymentMethod: 'PIX', payee: target({ pixKey: { keyType, key: 'x' } }) }),
      );
      assert.equal(r.status, 'ready', keyType);
    }
  });

  // Chave presente porém em branco é chave ausente — o cadastro guarda `''` com mais frequência
  // que `null` (CHECK do bloco bancário).
  it('trata chave em branco como ausente', () => {
    const r = checkPayoutReadiness(
      candidate({
        paymentMethod: 'PIX',
        payee: target({ pixKey: { keyType: 'email', key: '  ' } }),
      }),
    );
    assert.equal(r.status, 'incomplete');
  });

  it('recusa PIX sem chave apontando o campo', () => {
    const r = checkPayoutReadiness(candidate({ paymentMethod: 'PIX' }));
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['pix-key']);
    assert.equal(reasonFor(r, 'pix-key'), 'missing');
  });

  // Conta completa não substitui chave: quem escolheu PIX no lançamento paga por PIX.
  it('não aceita conta bancária no lugar da chave PIX', () => {
    const r = checkPayoutReadiness(candidate({ paymentMethod: 'PIX', payee: fullAccount() }));
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['pix-key']);
  });
});

// O Segmento J (p. 32 do layout) grava CÓDIGO DE BARRAS de 44 dígitos, e não tem campo algum de
// agência ou conta do favorecido — é a confirmação, na fonte, de que o boleto não depende do
// cadastro bancário.
const BARCODE = '23791234500000150000123456789012345678901234'; // 44 dígitos
const DIGITABLE_LINE = '23791234500000150000123456789012345678901234567'; // 47 — não serve

describe('checkPayoutReadiness — boleto e guia dependem do código de barras, não do favorecido', () => {
  for (const paymentMethod of ['Boleto', 'GuiaRecolhimento'] as const) {
    it(`aprova ${paymentMethod} com código de barras e favorecido sem banco`, () => {
      const r = checkPayoutReadiness(candidate({ paymentMethod, paymentDetail: BARCODE }));
      assert.equal(r.status, 'ready');
    });

    it(`recusa ${paymentMethod} sem código de barras`, () => {
      const r = checkPayoutReadiness(candidate({ paymentMethod, payee: fullAccount() }));
      assert.equal(r.status, 'incomplete');
      assert.deepEqual(fieldsOf(r), ['payment-detail']);
    });
  }

  it('trata código de barras em branco como ausente', () => {
    const r = checkPayoutReadiness(candidate({ paymentMethod: 'Boleto', paymentDetail: '   ' }));
    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'payment-detail'), 'missing');
  });

  // Aceita o dado com a pontuação que o cadastro às vezes guarda — o campo do arquivo é numérico.
  it('ignora pontuação no código de barras', () => {
    const dotted = '23791.23450 00001.500001 23456.789012 3 45678901234';
    const r = checkPayoutReadiness(candidate({ paymentMethod: 'Boleto', paymentDetail: dotted }));
    assert.equal(r.status, 'ready');
  });

  // 47 dígitos é LINHA DIGITÁVEL: dado presente e inaproveitável enquanto não houver conversão —
  // o mesmo desfecho do nome de banco sem código. Não é hipótese: 1 dos 20 boletos do dump de
  // produção está nesse formato.
  it('marca a linha digitável como inconvertível, não como ausente', () => {
    const r = checkPayoutReadiness(
      candidate({ paymentMethod: 'Boleto', paymentDetail: DIGITABLE_LINE }),
    );
    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'payment-detail'), 'unmappable');
  });

  it('marca comprimento arbitrário como malformado', () => {
    for (const detail of ['34191790010', '123', '9'.repeat(50)]) {
      const r = checkPayoutReadiness(candidate({ paymentMethod: 'Boleto', paymentDetail: detail }));
      assert.equal(reasonFor(r, 'payment-detail'), 'malformed', detail);
    }
  });
});

describe('checkPayoutReadiness — TED/transferência é a única rota que exige conta estruturada', () => {
  it('aprova a conta completa', () => {
    const r = checkPayoutReadiness(candidate({ payee: fullAccount() }));
    assert.equal(r.status, 'ready');
  });

  // CA3: a recusa diz QUAL campo falta. O favorecido sem destino algum não devolve um slug
  // genérico — devolve a lista inteira do que o segmento A vai cobrar.
  it('lista todos os campos quando o favorecido não tem destino cadastrado', () => {
    const r = checkPayoutReadiness(candidate({ payee: null }));
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), [
      'payee-bank-code',
      'payee-agency',
      'payee-account-number',
      'payee-account-digit',
    ]);
    for (const gap of gapsOf(r)) assert.equal(gap.reason, 'missing');
  });

  // CA2: nome de banco em texto livre NÃO vira código inventado nem string vazia no campo
  // posicional — falha com motivo próprio, distinto de "não preenchido".
  it('recusa banco em texto livre como inconvertível, não como ausente', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), bank: 'Bradesco S.A.' }) }),
    );
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['payee-bank-code']);
    assert.equal(reasonFor(r, 'payee-bank-code'), 'unmappable');
  });

  it('aceita código de banco curto e o alinha em 3 dígitos', () => {
    const r = checkPayoutReadiness(candidate({ payee: target({ ...fullAccount(), bank: '1' }) }));
    assert.equal(r.status, 'ready');
  });
});

describe('checkPayoutReadiness — decomposição da agência (CA4)', () => {
  // O cadastro tem UM dígito verificador; o arquivo pede dois. O da agência só existe quando vem
  // embutido no próprio campo, com separador explícito.
  it('separa agência e DV quando o separador está presente', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), agency: '1234-5' }) }),
    );
    assert.equal(r.status, 'ready');
  });

  // O DV da agência é declarado OPCIONAL pelo layout (G009 — "Campo Não Obrigatório, Informação
  // Opcional"). Sem separador, `12345` é a agência inteira e a posição 029 sai em branco. Recusar
  // aqui tiraria da remessa um cadastro que o banco considera completo.
  it('aprova agência sem DV — o layout declara o dígito opcional', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), agency: '12345' }) }),
    );
    assert.equal(r.status, 'ready');
  });

  // Sem separador NUNCA se inventa o DV: `12345` é agência de cinco dígitos, jamais `1234` + `5`.
  // A tolerância acima é sobre exigir o campo, não sobre adivinhar seu conteúdo.
  it('não fabrica DV a partir do último dígito da agência', () => {
    const r = decomposePayeeAccount(target({ ...fullAccount(), agency: '12345' }));
    assert.ok(isOk(r));
    assert.equal(r.value.agency, '12345');
    assert.equal(r.value.agencyDigit, '');
  });

  it('recusa agência que não cabe nas 5 posições do segmento A', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), agency: '123456-7' }) }),
    );
    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'payee-agency'), 'malformed');
  });

  it('recusa agência com caractere não numérico', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), agency: 'AG 1234' }) }),
    );
    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'payee-agency'), 'malformed');
  });
});

describe('checkPayoutReadiness — decomposição da conta (CA4)', () => {
  it('aceita o DV embutido na conta, dispensando o campo separado', () => {
    const r = checkPayoutReadiness(
      candidate({
        payee: target({ ...fullAccount(), accountNumber: '123456-7', checkDigit: null }),
      }),
    );
    assert.equal(r.status, 'ready');
  });

  it('aponta o DV da conta quando não há nem embutido nem campo próprio', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), checkDigit: null }) }),
    );
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['payee-account-digit']);
  });

  it('aceita DV alfabético X — módulo 11 produz resto 10', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), checkDigit: 'X' }) }),
    );
    assert.equal(r.status, 'ready');
  });

  it('recusa conta que não cabe nas 12 posições do segmento A', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), accountNumber: '1234567890123' }) }),
    );
    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'payee-account-number'), 'malformed');
  });

  // G011: "Para os Bancos que se utilizam de duas posições para o Dígito Verificador do Número da
  // Conta Corrente, preencher este campo com a 1ª posição deste dígito. Exemplo: Número C/C =
  // 45981-36. Neste caso Dígito Verificador da Conta = 3". O campo tem UMA posição; o descarte da
  // segunda é decisão do layout, não nossa.
  it('aceita DV de duas posições e usa a primeira, como o layout manda', () => {
    const r = decomposePayeeAccount(target({ ...fullAccount(), checkDigit: '36' }));
    assert.ok(isOk(r));
    assert.equal(r.value.accountDigit, '3');
  });

  it('aceita DV de duas posições embutido na conta — o exemplo 45981-36 do layout', () => {
    const r = decomposePayeeAccount(
      target({ ...fullAccount(), accountNumber: '45981-36', checkDigit: null }),
    );
    assert.ok(isOk(r));
    assert.equal(r.value.accountNumber, '000000045981');
    assert.equal(r.value.accountDigit, '3');
  });

  it('recusa DV da conta com mais de duas posições', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), checkDigit: '789' }) }),
    );
    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'payee-account-digit'), 'malformed');
  });

  // Todos os defeitos de uma vez: o operador corrige a linha inteira, não um campo por rodada.
  // A agência `12345` NÃO entra na lista — sem DV ela já está completa (G009).
  it('acumula os defeitos em vez de parar no primeiro', () => {
    const r = checkPayoutReadiness(
      candidate({
        payee: target({ bank: 'Itaú', agency: '12345', accountNumber: null, checkDigit: null }),
      }),
    );
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), [
      'payee-bank-code',
      'payee-account-number',
      'payee-account-digit',
    ]);
  });
});
