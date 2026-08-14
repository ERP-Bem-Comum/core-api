import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

// W0 RED: a regra de completude por forma de pagamento ainda não existe.
import { checkPayoutReadiness } from '#src/modules/financial/domain/payout/payout-readiness.ts';
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
      candidate({ paymentMethod: 'PIX', payee: target({ pixKey: 'a@b.com' }) }),
    );
    assert.equal(r.status, 'ready');
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

describe('checkPayoutReadiness — boleto e guia dependem da linha digitável, não do favorecido', () => {
  for (const paymentMethod of ['Boleto', 'GuiaRecolhimento'] as const) {
    it(`aprova ${paymentMethod} com linha digitável e favorecido sem banco`, () => {
      const r = checkPayoutReadiness(candidate({ paymentMethod, paymentDetail: '34191790010' }));
      assert.equal(r.status, 'ready');
    });

    it(`recusa ${paymentMethod} sem linha digitável`, () => {
      const r = checkPayoutReadiness(candidate({ paymentMethod, payee: fullAccount() }));
      assert.equal(r.status, 'incomplete');
      assert.deepEqual(fieldsOf(r), ['payment-detail']);
    });
  }

  it('trata linha digitável em branco como ausente', () => {
    const r = checkPayoutReadiness(candidate({ paymentMethod: 'Boleto', paymentDetail: '   ' }));
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['payment-detail']);
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
      'payee-agency-digit',
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

  // Sem separador a leitura é ambígua: `12345` pode ser agência de 5 dígitos ou 4 + DV. Escolher
  // um dos dois inventaria o dígito que vai para a posição 029.
  it('recusa o DV da agência quando não há separador — sem adivinhar', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), agency: '12345' }) }),
    );
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['payee-agency-digit']);
    assert.equal(reasonFor(r, 'payee-agency-digit'), 'missing');
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

  it('recusa DV da conta com mais de um caractere', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), checkDigit: '78' }) }),
    );
    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'payee-account-digit'), 'malformed');
  });

  // Todos os defeitos de uma vez: o operador corrige a linha inteira, não um campo por rodada.
  it('acumula os defeitos em vez de parar no primeiro', () => {
    const r = checkPayoutReadiness(
      candidate({
        payee: target({ bank: 'Itaú', agency: '12345', accountNumber: null, checkDigit: null }),
      }),
    );
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), [
      'payee-bank-code',
      'payee-agency-digit',
      'payee-account-number',
      'payee-account-digit',
    ]);
  });
});
