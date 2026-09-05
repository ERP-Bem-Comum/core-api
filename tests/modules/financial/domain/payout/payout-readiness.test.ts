import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/index.ts';
import { checkPayoutReadiness } from '#src/modules/financial/domain/payout/payout-readiness.ts';
import { decomposePayeeAccount } from '#src/modules/financial/domain/payout/payee-account.ts';
import { hasRemittanceIssuer } from '#src/modules/financial/domain/payout/van-routes.ts';
import type {
  PayeePaymentTarget,
  PayoutCandidate,
  PayoutGap,
  PayoutReadiness,
  VanRoute,
} from '#src/modules/financial/domain/payout/types.ts';
import type { PaymentMethod } from '#src/modules/financial/domain/document/types.ts';

const EMPTY_TARGET: PayeePaymentTarget = {
  bank: null,
  agency: null,
  accountNumber: null,
  checkDigit: null,
  pixKey: null,
  document: null,
};

// A inscrição que o Segmento J-52 exige do boleto (#891). SINTÉTICA — zeros e um sufixo —, porque os
// repositórios são públicos e fixture é o caminho por onde dado real de cadastro entra.
//
// ⚠️ ERA `'inscricao-opaca'`, e a troca é um achado da #863, não arrumação. O valor opaco tinha uma
// razão escrita: provar que a régua "só pergunta se HÁ inscrição", já que quem valida formato é
// `partners`. Essa afirmação DEIXOU DE SER INTEIRAMENTE VERDADEIRA — a régua passou a perguntar uma
// segunda coisa, e é sobre a forma: *esta inscrição pode ser escrita num campo `Num` do CNAB sem
// virar outra?*
//
// A distinção que sobrevive, e que a fixture ainda precisa respeitar, é fina: a régua continua NÃO
// validando CPF/CNPJ — não confere dígito, não confere comprimento, não sabe o que é uma inscrição
// válida. Ela só recusa o que `digits()` DESTRUIRIA em silêncio. Um valor sem nenhum dígito, como o
// anterior, não distinguia os dois casos: ele falharia pelas duas razões ao mesmo tempo.
const PAYEE_DOCUMENT = '00000000000191';

// CNPJ alfanumérico, no formato que a Receita emite desde 07/2026 (ADR-0044): doze posições
// alfanuméricas mais dois dígitos verificadores numéricos. É inscrição VÁLIDA — e é exatamente por
// isso que ela não pode ser tratada como cadastro a corrigir.
const ALPHANUMERIC_DOCUMENT = '12ABC34501DE35';

const target = (patch: Partial<PayeePaymentTarget>): PayeePaymentTarget => ({
  ...EMPTY_TARGET,
  ...patch,
});

// Favorecido que satisfaz a rota de boleto: basta a inscrição, nenhum dado bancário. É a fixture que
// separa "sem banco" de "sem identidade" — o boleto tolera o primeiro e recusa o segundo.
const billetPayee = (): PayeePaymentTarget => target({ document: PAYEE_DOCUMENT });

// Conta estruturada COMPLETA: o único arranjo que o segmento A aceita sem inventar campo.
//
// ⚠️ O DV é `0` e não pode ser qualquer dígito: desde a #734 o banco 237 tem o dígito CALCULADO
// (módulo 11, pesos 2-7 — `account-check-digit.ts`), e `0` é o que o algoritmo do Bradesco produz
// para a conta `123456`. Trocar um pelo outro sem recalcular derruba toda esta suíte — o que é o
// gate funcionando, não ruído. Fixture com DV inventado descrevia um cadastro que o banco recusa.
const fullAccount = (): PayeePaymentTarget =>
  target({ bank: '237', agency: '1234-5', accountNumber: '123456', checkDigit: '0' });

// Banco cujo algoritmo de DV NÃO está no acervo — a verificação devolve `not-verifiable` e a conta
// segue validada só por FORMA. É a fixture certa para todo caso cuja matéria é a leitura do campo,
// e não a veracidade do dígito: usar 237 ali faria o teste depender de aritmética que não é o
// assunto dele.
const unverifiableBank = (): PayeePaymentTarget => target({ ...fullAccount(), bank: '001' });

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

// O desfecho esperado QUANDO O CADASTRO ESTÁ BOM — `ready` se a rota tem emissor, `no-issuer` se
// não tem (#837).
//
// ⚠️ Derivado de `hasRemittanceIssuer`, e NÃO escrito à mão em cada caso, por duas razões que se
// somam. A primeira: os casos abaixo medem LEITURA DE CADASTRO — que a chave basta, que a linha
// digitável converte, que a pontuação não atrapalha. Fixar `'ready'` neles os faria medir também
// "existe emissor", e eles quebrariam no dia em que o emissor de Pix entrasse, sem defeito algum. A
// segunda, e é a que importa mais: derivar da fonte mantém a asserção EXATA. `notEqual(status,
// 'incomplete')` passaria por ser cego — e `no-issuer` só é alcançável depois de o dado ser aceito,
// porque a régua julga cadastro primeiro. Então afirmar o desfecho exato já prova que o dado passou.
const whenDataIsGood = (route: VanRoute): 'ready' | 'no-issuer' =>
  hasRemittanceIssuer(route) ? 'ready' : 'no-issuer';

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

// ⚠️ ESTE BLOCO JÁ TROCOU DE NOME DUAS VEZES, e o vaivém é o registro mais útil que ele carrega.
//
// Era "PIX exige a chave, e só a chave" (#708: *"PIX paga por chave, não olha agência ou conta"*).
// Virou "exige a chave E o bloco bancário" (#838), porque o golden do banco traz banco, agência, DV,
// conta e DV preenchidos no Segmento A e o layout marca os campos com asterisco. Voltou a ser "e só
// ela" (#945), quando o Bradesco arbitrou por escrito que essas posições podem sair ZERADAS no Pix
// iniciado por chave.
//
// A lição que sobra, e é a razão de este parágrafo continuar aqui: **golden prova como um arquivo
// foi montado, não o que o ERP deve coletar**, e o asterisco do manual significa "merece atenção
// especial", não "obrigatório" (legenda, p. 7 — o manual chega a marcar `*G009` e escrever "Campo
// Não Obrigatório" na descrição). Quem reabrir a exigência com base numa dessas duas evidências
// estará refazendo o mesmo salto.
//
// O que NÃO oscilou, e a #948 reforça: o pré-voo não pode aprovar o que o emissor recusa. As duas
// condições da CHAVE (comprimento e tipo) são verificadas aqui justamente por isso.
const pixPayee = (): PayeePaymentTarget =>
  target({ ...fullAccount(), pixKey: { keyType: 'email', key: 'a@b.com' } });

describe('checkPayoutReadiness — PIX exige a chave, e só ela (#945)', () => {
  it('aceita PIX com chave e conta completa', () => {
    const r = checkPayoutReadiness(candidate({ paymentMethod: 'PIX', payee: pixPayee() }));
    assert.equal(r.status, whenDataIsGood('pix'));
  });

  // ⚠️ INVERTIDO PELA #948 (CA2), e o teste anterior dizia o contrário — "não julga o tipo da chave,
  // apenas a existência dela" —, apoiado em duas premissas que eram boas e não bastavam: o
  // vocabulário de tipos é de `partners`, e duplicá-lo criaria segunda fonte da verdade.
  //
  // A primeira continua verdadeira; a segunda deixou de valer, porque a fonte NÃO está duplicada: a
  // lista de tipos PAGÁVEIS vive em `domain/payout/pix-key.ts` e o emissor desce até ela. Não são
  // duas listas — é uma, consumida dos dois lados, no molde de `van-routes.ts`.
  //
  // E o que derrubou a separação "o cadastro está completo?" × "sei emitir isto?" foi o CUSTO: a
  // recusa do emissor vem DEPOIS do `allocateNsa`, então deixá-la para a geração queima um número da
  // série a cada tentativa. A #837 estabeleceu que as duas perguntas não podem discordar; esta é a
  // segunda metade dela, sobre as CONDIÇÕES do emissor e não sobre a existência dele.
  it('aceita todo tipo de chave que o emissor sabe traduzir', () => {
    for (const keyType of ['phone', 'email', 'cpf', 'cnpj', 'random-key']) {
      const r = checkPayoutReadiness(
        candidate({
          paymentMethod: 'PIX',
          payee: target({ ...fullAccount(), pixKey: { keyType, key: 'x' } }),
        }),
      );
      assert.equal(r.status, whenDataIsGood('pix'), keyType);
    }
  });

  it('recusa o tipo de chave que o G100 não prevê, em vez de deixar o emissor queimar o NSA', () => {
    const r = checkPayoutReadiness(
      candidate({
        paymentMethod: 'PIX',
        payee: target({
          ...fullAccount(),
          pixKey: { keyType: 'algo-que-o-G100-nao-tem', key: 'x' },
        }),
      }),
    );

    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['pix-key']);
    // `unmappable` — não há o que corrigir no VALOR: é preciso outra chave.
    assert.equal(reasonFor(r, 'pix-key'), 'unmappable');
  });

  // CA8: `keyType` vazio cai na mesma régua, e o desfecho é o mesmo. Hoje o reader o recusa
  // derrubando a geração INTEIRA (contrato tudo-ou-nada), com o pré-voo tendo aprovado a linha.
  it('trata tipo de chave vazio como não suportado', () => {
    const r = checkPayoutReadiness(
      candidate({
        paymentMethod: 'PIX',
        payee: target({ ...fullAccount(), pixKey: { keyType: '', key: 'x' } }),
      }),
    );

    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'pix-key'), 'unmappable');
  });

  // CA1. Alcançável por cadastro LEGÍTIMO: o campo `G101` tem 99 posições e o cadastro aceita mais.
  //
  // ⚠️ O perigo não é o arquivo ser recusado — é `text()` TRUNCAR por desenho. As 99 primeiras
  // posições de uma chave maior são uma chave DIFERENTE, e ou o SPI a recusa, ou ela pertence a
  // outro recebedor. O emissor já barra isso; o que faltava era barrar antes de o NSA ser alocado.
  it('recusa a chave que não cabe nas 99 posições do G101', () => {
    const r = checkPayoutReadiness(
      candidate({
        paymentMethod: 'PIX',
        payee: target({ ...fullAccount(), pixKey: { keyType: 'email', key: 'k'.repeat(100) } }),
      }),
    );

    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['pix-key']);
    // `malformed`, e não `unmappable`: a chave É conversível e É uma chave — o que ela não é, é
    // representável no campo. Ver a nota em `payout-readiness.ts`, `case 'pix'`.
    assert.equal(reasonFor(r, 'pix-key'), 'malformed');
  });

  it('aceita a chave de exatamente 99 posições — o limite é inclusivo', () => {
    const r = checkPayoutReadiness(
      candidate({
        paymentMethod: 'PIX',
        payee: target({ ...fullAccount(), pixKey: { keyType: 'email', key: 'k'.repeat(99) } }),
      }),
    );

    assert.equal(r.status, whenDataIsGood('pix'));
  });

  // As duas condições ACUMULAM: quem tem chave longa demais E de tipo não suportado precisa ver as
  // duas de uma vez, não uma volta ao cadastro por vez. Mesma disciplina do boleto.
  it('acumula as duas condições da chave', () => {
    const r = checkPayoutReadiness(
      candidate({
        paymentMethod: 'PIX',
        payee: target({
          ...fullAccount(),
          pixKey: { keyType: 'nao-existe', key: 'k'.repeat(100) },
        }),
      }),
    );

    assert.equal(r.status, 'incomplete');
    assert.deepEqual(
      gapsOf(r)
        .map((g) => g.reason)
        .sort(),
      ['malformed', 'unmappable'],
    );
  });

  // Sem chave, o pré-voo PARA — listar "comprimento" e "tipo" de um campo vazio mandaria o operador
  // corrigir o que não existe. A pendência é uma só: cadastrar a chave.
  it('não acumula condições da chave quando a chave nem existe', () => {
    const r = checkPayoutReadiness(
      candidate({ paymentMethod: 'PIX', payee: target({ ...fullAccount(), pixKey: null }) }),
    );

    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['pix-key']);
    assert.equal(reasonFor(r, 'pix-key'), 'missing');
  });

  // Chave presente porém em branco é chave ausente — o cadastro guarda `''` com mais frequência
  // que `null` (CHECK do bloco bancário).
  it('trata chave em branco como ausente', () => {
    const r = checkPayoutReadiness(
      candidate({
        paymentMethod: 'PIX',
        payee: target({ ...fullAccount(), pixKey: { keyType: 'email', key: '  ' } }),
      }),
    );
    assert.equal(r.status, 'incomplete');
  });

  it('recusa PIX sem chave apontando o campo', () => {
    const r = checkPayoutReadiness(candidate({ paymentMethod: 'PIX', payee: fullAccount() }));
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['pix-key']);
    assert.equal(reasonFor(r, 'pix-key'), 'missing');
  });

  // Conta completa não substitui chave: quem escolheu PIX no lançamento paga por PIX, e trocar a
  // rota mudaria o custo e o prazo que o operador aceitou. Sobreviveu às duas viradas de régua —
  // a conta nunca bastou, nem quando era exigida além da chave (#838), nem agora que não é exigida.
  it('não aceita conta bancária no lugar da chave PIX', () => {
    const r = checkPayoutReadiness(candidate({ paymentMethod: 'PIX', payee: fullAccount() }));
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['pix-key']);
  });

  // A chave é a ÚNICA pendência possível nesta rota. Sem cadastro nenhum, o operador recebe um
  // caminho só — e não uma lista de campos bancários que o pagamento não vai usar.
  it('aponta só a chave quando o favorecido não tem cadastro algum', () => {
    const r = checkPayoutReadiness(candidate({ paymentMethod: 'PIX' }));
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['pix-key']);
  });

  // ⚠️ O TESTE QUE FIXA A REVERSÃO DA #945, e o inverso exato do que a suíte afirmava entre a #838 e
  // ela. Favorecido com chave e SEM nenhum dado bancário é o cenário que a modalidade existe para
  // atender; exigir conta aqui represava justamente ele.
  //
  // A arbitragem foi do banco, por escrito (laudo de 05/09/2026): banco, agência e conta do
  // favorecido podem sair zerados no Pix iniciado por chave. O emissor passou a zerá-los, e é isso
  // que autoriza esta régua — nesta ordem. Ver `PIX_ZEROED_PAYEE_ACCOUNT`.
  it('aceita PIX com chave e SEM dado bancário algum', () => {
    const r = checkPayoutReadiness(
      candidate({
        paymentMethod: 'PIX',
        payee: target({ pixKey: { keyType: 'email', key: 'a@b.com' } }),
      }),
    );
    assert.equal(r.status, whenDataIsGood('pix'));
  });

  // O efeito colateral desejado da reversão, e ele merece teste próprio por ser o que mais surpreende
  // quem conhece a régua da transferência: o DV divergente deixa de bloquear no Pix. Está certo — o
  // dígito não vai no arquivo, e as posições saem zeradas. A régua de DV continua onde ele é escrito.
  it('não bloqueia por DV divergente — o dígito não vai no arquivo desta rota', () => {
    const r = checkPayoutReadiness(
      candidate({
        paymentMethod: 'PIX',
        payee: target({
          ...fullAccount(),
          checkDigit: '9',
          pixKey: { keyType: 'random-key', key: 'a-b-c' },
        }),
      }),
    );
    assert.equal(r.status, whenDataIsGood('pix'));
  });
});

// O Segmento J (p. 32 do layout) grava CÓDIGO DE BARRAS de 44 dígitos, e não tem campo algum de
// agência ou conta do favorecido — é a confirmação, na fonte, de que o boleto não depende do
// cadastro bancário.
const BARCODE = '23791234500000150000123456789012345678901234'; // 44 dígitos
// Linha digitável de COBRANÇA (47) e de ARRECADAÇÃO (48), com os DVs de bloco que a regra FEBRABAN
// calcula — os mesmos pares sintéticos de `digitable-line.test.ts`. Nenhum boleto real entra aqui:
// linha digitável identifica cedente, valor e vencimento, e os três repositórios são públicos.
const DIGITABLE_LINE = '23791234546789012345767890123457512340000015000'; // 47

describe('checkPayoutReadiness — inscrição alfanumérica não vira outra em silêncio (#863)', () => {
  // ⚠️ O DEFEITO QUE ESTES CASOS FIXAM NÃO ERA UMA RECUSA — era um PAGAMENTO. `digits()` removia as
  // letras e re-preenchia com zeros até 14, produzindo uma inscrição diferente e sintaticamente
  // perfeita: o arquivo era aceito, o dinheiro saía, e o favorecido chegava ao banco identificado por
  // outro documento. Nada no caminho reclamava.
  //
  //     digits('12ABC34501DE35', 14)  →  '00000123450135'
  //
  // A régua vive no pré-voo para que a recusa venha ANTES do `allocateNsa`, como as duas da chave Pix.
  for (const [paymentMethod, route] of [
    ['PIX', 'pix'],
    ['TED', 'transfer'],
    ['Boleto', 'billet'],
  ] as const) {
    it(`recusa inscrição alfanumérica na rota ${route}`, () => {
      const r = checkPayoutReadiness(
        candidate({
          paymentMethod,
          paymentDetail: DIGITABLE_LINE,
          payee: target({
            ...fullAccount(),
            document: ALPHANUMERIC_DOCUMENT,
            pixKey: { keyType: 'email', key: 'a@b.com' },
          }),
        }),
      );

      assert.equal(r.status, 'incomplete', paymentMethod);
      assert.ok(fieldsOf(r).includes('payee-document'), paymentMethod);
      // `unmappable`, e NÃO `malformed`: o CNPJ com letras está bem formado desde 07/2026 (ADR-0044).
      // Mandar "corrigir o formato" mandaria o operador estragar uma inscrição correta — o que falta
      // é o BANCO dizer como quer recebê-la (#863, pergunta em aberto).
      assert.equal(reasonFor(r, 'payee-document'), 'unmappable', paymentMethod);
    });
  }

  it('aceita inscrição numérica COM máscara — tirar pontuação continua sendo tradução legítima', () => {
    const r = checkPayoutReadiness(
      candidate({
        paymentMethod: 'TED',
        payee: target({ ...fullAccount(), document: '12.345.678/0001-99' }),
      }),
    );

    assert.equal(r.status, whenDataIsGood('transfer'));
  });

  // A régua NÃO valida CPF/CNPJ, e este caso é o que mantém a distinção viva: uma inscrição numérica
  // de comprimento improvável passa, porque quem valida documento é `partners`. O que a régua recusa
  // é só o que `digits()` destruiria.
  it('não se transforma em validador de CPF/CNPJ', () => {
    const r = checkPayoutReadiness(
      candidate({ paymentMethod: 'TED', payee: target({ ...fullAccount(), document: '123' }) }),
    );

    assert.equal(r.status, whenDataIsGood('transfer'));
  });

  // Inscrição AUSENTE é outra pendência, com outra ação: cadastrar. Se as duas caíssem no mesmo
  // motivo, o operador de um boleto sem favorecido seria mandado a escalar ao banco.
  it('inscrição ausente continua sendo `missing`, e não `unmappable`', () => {
    const r = checkPayoutReadiness(
      candidate({ paymentMethod: 'Boleto', paymentDetail: DIGITABLE_LINE }),
    );

    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'payee-document'), 'missing');
  });

  // ACUMULA com a pendência da rota: chave Pix longa demais E inscrição alfanumérica são
  // independentes, e resolver uma não libera o título.
  it('acumula com a pendência da própria rota', () => {
    const r = checkPayoutReadiness(
      candidate({
        paymentMethod: 'PIX',
        payee: target({
          ...fullAccount(),
          document: ALPHANUMERIC_DOCUMENT,
          pixKey: { keyType: 'email', key: 'k'.repeat(100) },
        }),
      }),
    );

    assert.equal(r.status, 'incomplete');
    assert.deepEqual([...fieldsOf(r)].sort(), ['payee-document', 'pix-key']);
  });
});

const TAX_GUIDE_LINE = '836500000010500012345673890123456786901234567898'; // 48

describe('checkPayoutReadiness — boleto e guia dependem do código de barras, não do favorecido', () => {
  for (const [paymentMethod, route] of [
    ['Boleto', 'billet'],
    ['GuiaRecolhimento', 'tax-guide'],
  ] as const) {
    // O BOLETO exige a inscrição do favorecido (Segmento J-52, #891); a GUIA, não. A assimetria é do
    // layout e não do cadastro: o J-52 é registro de título de COBRANÇA, e o Segmento O — o da guia —
    // não tem campo de inscrição algum. Carimbar a exigência nas duas seria inventar norma, e o
    // parâmetro do loop é justamente o que mantém as duas rotas medindo coisas diferentes.
    const forRoute = (t: PayeePaymentTarget): PayeePaymentTarget =>
      route === 'billet' ? target({ ...t, document: PAYEE_DOCUMENT }) : t;

    it(`aceita o código de barras de ${paymentMethod} com favorecido sem banco`, () => {
      const r = checkPayoutReadiness(
        candidate({ paymentMethod, paymentDetail: BARCODE, payee: forRoute(EMPTY_TARGET) }),
      );
      assert.equal(r.status, whenDataIsGood(route));
    });

    it(`recusa ${paymentMethod} sem código de barras`, () => {
      const r = checkPayoutReadiness(candidate({ paymentMethod, payee: forRoute(fullAccount()) }));
      assert.equal(r.status, 'incomplete');
      // UM campo só: com a inscrição presente, a única lacuna é o código de barras. Se este assert
      // passar a ver dois, é sinal de que a exigência do J-52 vazou para a rota errada.
      assert.deepEqual(fieldsOf(r), ['payment-detail']);
    });
  }

  // A contraprova da assimetria acima, e a razão de ela existir: sem inscrição, o BOLETO acusa —
  // e acusa NOMEANDO O CAMPO, para o operador saber que a correção é no cadastro do favorecido.
  it('recusa Boleto cujo favorecido não tem inscrição, mesmo com o código de barras certo', () => {
    const r = checkPayoutReadiness(
      candidate({ paymentMethod: 'Boleto', paymentDetail: BARCODE, payee: EMPTY_TARGET }),
    );
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['payee-document']);
  });

  it('trata código de barras em branco como ausente', () => {
    const r = checkPayoutReadiness(candidate({ paymentMethod: 'Boleto', paymentDetail: '   ' }));
    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'payment-detail'), 'missing');
  });

  // Aceita o dado com a pontuação que o cadastro às vezes guarda — o campo do arquivo é numérico.
  it('ignora pontuação no código de barras', () => {
    const dotted = '23791.23450 00001.500001 23456.789012 3 45678901234';
    const r = checkPayoutReadiness(
      candidate({ paymentMethod: 'Boleto', paymentDetail: dotted, payee: billetPayee() }),
    );
    assert.equal(r.status, 'ready');
  });

  // CA1 — a linha digitável passou a servir (#788). É ela que vem impressa no boleto e é ela que o
  // operador digita; recusá-la bloqueava um título com o dado preenchido corretamente. Não é
  // hipótese: 1 dos 20 boletos do dump de produção do legado está nesse formato.
  it('aprova a linha digitável de cobrança, que a régua converte para código de barras', () => {
    const r = checkPayoutReadiness(
      candidate({ paymentMethod: 'Boleto', paymentDetail: DIGITABLE_LINE, payee: billetPayee() }),
    );
    assert.equal(r.status, 'ready');
  });

  // A guia de arrecadação tem 48 e nunca foi dado errado — era um terceiro comprimento que ninguém
  // tinha mapeado, e caía em `malformed` acusando o operador de um erro que era do sistema.
  it('converte a linha digitável de arrecadação sem acusar o operador', () => {
    const r = checkPayoutReadiness(
      candidate({ paymentMethod: 'GuiaRecolhimento', paymentDetail: TAX_GUIDE_LINE }),
    );
    assert.equal(r.status, whenDataIsGood('tax-guide'));
  });

  // CA2 — o comprimento está certo e o dado é numérico; o que falhou foi UM dígito. `malformed`
  // mandaria corrigir um formato que já está correto, e é a distinção que a #734 criou ao dar nome
  // próprio ao caso. O mesmo motivo que o DV da conta bancária usa.
  it('marca DV de campo que não fecha como check-digit-mismatch, não como malformado', () => {
    const wrongDigit = DIGITABLE_LINE[9] === '9' ? '8' : '9';
    const corrupted = DIGITABLE_LINE.slice(0, 9) + wrongDigit + DIGITABLE_LINE.slice(10);
    const r = checkPayoutReadiness(
      candidate({ paymentMethod: 'Boleto', paymentDetail: corrupted }),
    );
    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'payment-detail'), 'check-digit-mismatch');
  });

  // Com 44, 47 e 48 todos mapeados, o que sobra de comprimento é código truncado ou digitado a
  // mais — dado errado, e não formato que o sistema desconhece. `unmappable` deixou de valer para
  // este campo: ele continua sendo o motivo do banco em texto livre, em `readBankCode`.
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
        payee: target({ ...fullAccount(), accountNumber: '123456-0', checkDigit: null }),
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

  // ⚠️ Banco NÃO-verificável de propósito. O `X` é convenção de outras instituições; o Bradesco,
  // quando o resto é 1, usa `0` ou `P` — nunca `X` (manual 4008-523-0096 v16 p. 30). Manter 237
  // aqui faria o caso afirmar que o Bradesco aceita um dígito que ele não emite.
  it('aceita DV alfabético X — módulo 11 produz resto 10', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...unverifiableBank(), checkDigit: 'X' }) }),
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
  // ⚠️ Também não-verificável, e a própria G011 diz por quê: ela fala "para os Bancos que se
  // utilizam de DUAS posições". O Bradesco usa uma — o cálculo da #734 confirma pelo outro lado, já
  // que `45981` daria DV `0` ou `P`, nunca `3`. Este caso é sobre a leitura de um cadastro de OUTRA
  // instituição, e é assim que ele deve estar escrito.
  it('aceita DV de duas posições e usa a primeira, como o layout manda', () => {
    const r = decomposePayeeAccount(target({ ...unverifiableBank(), checkDigit: '36' }));
    assert.ok(isOk(r));
    assert.equal(r.value.accountDigit, '3');
  });

  it('aceita DV de duas posições embutido na conta — o exemplo 45981-36 do layout', () => {
    const r = decomposePayeeAccount(
      target({ ...unverifiableBank(), accountNumber: '45981-36', checkDigit: null }),
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

/**
 * A POLÍTICA do dígito verificador — issue #734.
 *
 * O cálculo em si é provado em `account-check-digit.test.ts`, contra o exemplo literal do manual.
 * O que esta suíte fixa é a decisão: o que o pré-voo FAZ com cada veredito.
 *
 * A assimetria é o ponto. `mismatch` bloqueia porque sabemos, antes de enviar, que o banco recusaria
 * — o manual 4008-523-0096 v16 p. 29 diz que na Modalidade 01 "serão validados os dígitos de
 * controle da Agência e da conta corrente". `not-verifiable` não bloqueia porque é limite NOSSO, e
 * fazer o fornecedor pagar pela nossa lacuna de documentação seria a recusa errada.
 */
describe('checkPayoutReadiness — dígito verificador por cálculo (#734)', () => {
  it('bloqueia o título quando o dígito não é o que o banco calcula', () => {
    // Conta `123456` no Bradesco tem DV `0`. Qualquer outro é recusa certa do banco.
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), checkDigit: '1' }) }),
    );
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['payee-account-digit']);
    assert.equal(reasonFor(r, 'payee-account-digit'), 'check-digit-mismatch');
  });

  // O defeito que a #734 mediu, reproduzido: agência `1234-5` tem DV `5`, e o operador copiou esse
  // `5` no campo da conta. É o padrão de 44 dos 86 cadastros, e o que o banco recusaria.
  it('pega o DV da agência copiado no campo da conta — o defeito medido em produção', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), agency: '1234-5', checkDigit: '5' }) }),
    );
    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'payee-account-digit'), 'check-digit-mismatch');
  });

  // `check-digit-mismatch` NÃO é `malformed`, e a distinção é a razão de ele existir: o campo está
  // preenchido, é numérico e bem-formado. Quem mandar o operador "corrigir o formato" o manda
  // consertar o que já está certo.
  it('não confunde dígito errado com dígito malformado', () => {
    const errado = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), checkDigit: '1' }) }),
    );
    const malformado = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), checkDigit: '#' }) }),
    );
    assert.equal(reasonFor(errado, 'payee-account-digit'), 'check-digit-mismatch');
    assert.equal(reasonFor(malformado, 'payee-account-digit'), 'malformed');
  });

  it('confere também o DV EMBUTIDO — precedência diz de onde ele vem, não que esteja certo', () => {
    const r = checkPayoutReadiness(
      candidate({
        payee: target({ ...fullAccount(), accountNumber: '123456-1', checkDigit: null }),
      }),
    );
    assert.equal(r.status, 'incomplete');
    assert.equal(reasonFor(r, 'payee-account-digit'), 'check-digit-mismatch');
  });

  // Resto 1 admite `0` e `P` (manual, p. 30). As DUAS respostas passam — reprovar uma delas seria
  // recusa nossa, não do banco. A conta `100008` é um caso real desse resto.
  it('aceita as duas respostas certas quando o resto é 1', () => {
    for (const digito of ['0', 'P']) {
      const r = checkPayoutReadiness(
        candidate({
          payee: target({ ...fullAccount(), accountNumber: '100008', checkDigit: digito }),
        }),
      );
      assert.equal(r.status, 'ready', `esperava aprovar o DV ${digito}`);
    }
  });

  // Sem esta linha, o `P` do manual era classificado `malformed` — recusado por parecer erro de
  // digitação. O regex de forma não conhecia o alfabeto do próprio banco do convênio.
  it('não trata o P do Bradesco como campo malformado', () => {
    const r = decomposePayeeAccount(
      target({ ...fullAccount(), accountNumber: '100008', checkDigit: 'P' }),
    );
    assert.ok(isOk(r));
    assert.equal(r.value.accountDigit, 'P');
  });

  // O outro lado da política: fora do 237 nada muda. Um dígito que seria errado no Bradesco não
  // diz nada sobre uma conta do Banco do Brasil, cujo algoritmo não está no acervo.
  it('não recusa conta de banco cujo algoritmo não conhecemos', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...unverifiableBank(), checkDigit: '1' }) }),
    );
    assert.equal(r.status, 'ready');
  });

  // Banco ilegível já é lacuna própria; não deve ganhar uma SEGUNDA por causa do dígito, que ficou
  // impossível de verificar justamente por não se saber o banco.
  it('banco ilegível não gera lacuna extra de dígito', () => {
    const r = checkPayoutReadiness(
      candidate({ payee: target({ ...fullAccount(), bank: 'Bradesco S.A.' }) }),
    );
    assert.equal(r.status, 'incomplete');
    assert.deepEqual(fieldsOf(r), ['payee-bank-code']);
  });
});
