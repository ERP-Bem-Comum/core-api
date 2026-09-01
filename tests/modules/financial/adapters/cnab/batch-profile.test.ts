import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: o perfil de lote ainda não existe.
import {
  batchProfileFor,
  clearingHouseFor,
  tedPurposeFor,
  complementPurposeFor,
  type ProfiledPayment,
} from '#src/modules/financial/adapters/cnab/batch-profile.ts';

/**
 * Perfil do lote: o que muda no ENVELOPE quando a forma de lançamento muda (#711, fatia A).
 *
 * Fonte primária: `jun-19-layout-multipag.pdf` (local-only). Cada rota tem sua seção, e as seções
 * NÃO declaram o mesmo header de lote — a versão do layout difere entre elas (pp. 23, 31, 38, 44) e
 * há campo que existe numa seção e não noutra. Tratar o header como formato único, parametrizado só
 * pela forma, é o defeito que esta peça existe para impedir.
 *
 * A forma é DERIVADA do dado do título (CA11), nunca informada pelo chamador: com uma rota só, quem
 * chama e quem paga concordavam por acidente.
 */

const CEDENTE_BANK = '237';

// A forma da transferência sai do banco de QUEM RECEBE: mesmo banco do cedente é crédito interno,
// outro banco é transferência interbancária (#751).
const transferTo = (payeeBankCode: string): ProfiledPayment => ({
  route: 'transfer',
  payeeBankCode,
});

const transfer = transferTo('341');

// Os três primeiros dígitos do código de barras são o banco emissor do título (Bacen 2.926) — é o
// dado que decide se o boleto é do próprio banco ou de outro.
const billetOf = (bank: string): ProfiledPayment => ({
  route: 'billet',
  barcode: `${bank}91234500000150000123456789012345678901234`.slice(0, 44),
});

const profile = (payment: ProfiledPayment) => {
  const r = batchProfileFor(payment, CEDENTE_BANK);
  assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
  return r.value;
};

describe('Perfil de lote — o envelope muda com a rota, não só a forma', () => {
  it('transferência e boleto não compartilham a versão do layout do lote', () => {
    assert.notEqual(
      profile(transfer).batchLayoutVersion,
      profile(billetOf('341')).batchLayoutVersion,
    );
  });

  // O campo existe na seção de pagamentos e não existe na de cobrança, onde aquelas posições são
  // brancos. `null` diz "esta seção não tem o campo" — diferente de "tem, e vai vazio".
  it('o indicativo de forma de pagamento existe na transferência e não no boleto', () => {
    assert.equal(profile(transfer).paymentIndicator?.length, 2);
    assert.equal(profile(billetOf('341')).paymentIndicator, null);
  });

  // Coerência dentro do próprio registro: o manual liga a câmara que o Segmento A emite às formas
  // de TED (nota (2) da descrição da forma de lançamento). Crédito em conta com câmara de TED seria
  // contradição — e era o que o emissor produzia enquanto a forma era constante.
  it('a transferência para outra instituição declara forma de TED', () => {
    assert.equal(profile(transfer).launchForm, '41');
  });
});

/**
 * O defeito da #751: a forma era a constante `41` (TED outra titularidade) para todo favorecido, e
 * a câmara, `018` (TED), por default do Segmento A. Para quem tem conta no próprio banco do cedente
 * esse par é o que o validador oficial do Bradesco RECUSA — e o caminho nunca fora exercitado,
 * porque o emissor jamais produziu crédito em conta.
 *
 * Fonte primária (`jun-19-layout-multipag.pdf`, local-only): domínio de G029 na p. 100 (`01` =
 * Crédito em Conta Corrente, `41` = TED Outra Titularidade); nota (2) da mesma descrição na p. 101,
 * que tabula forma → câmara; e a ocorrência 'AK' de G059 na p. 107, que manda preencher `018` para
 * TED e zeros para as outras modalidades, nas colunas 018 a 020 do Segmento A.
 */
describe('Perfil de lote — a forma da transferência sai do banco do favorecido (#751)', () => {
  // CA1.
  it('favorecido no mesmo banco do cedente recebe crédito em conta, sem câmara', () => {
    const p = profile(transferTo(CEDENTE_BANK));

    assert.equal(p.launchForm, '01');
    assert.equal(clearingHouseFor(p.launchForm), '000');
  });

  // CA2 — e a segunda asserção é o que impede a "correção" de zerar a câmara para todo mundo.
  it('favorecido em outra instituição mantém a transferência interbancária, com a câmara dela', () => {
    for (const bank of ['341', '001', '033']) {
      const p = profile(transferTo(bank));

      assert.equal(p.launchForm, '41', bank);
      assert.equal(clearingHouseFor(p.launchForm), '018', bank);
      assert.notEqual(clearingHouseFor(p.launchForm), '000', bank);
    }
  });

  // O zero à esquerda é do CAMPO, não do banco: `1` e `001` são o mesmo Banco do Brasil. Comparar
  // as strings cruas classificaria um favorecido do próprio banco como sendo de fora — e o erro
  // sairia num arquivo bem-formado.
  it('compara os códigos já normalizados em três posições', () => {
    // Banco do Brasil escrito das duas formas: mesmo destino, logo mesma forma de lançamento.
    assert.equal(profile(transferTo('1')).launchForm, profile(transferTo('001')).launchForm);

    // E a normalização vale para os DOIS lados da comparação: cedente escrito curto, favorecido
    // escrito completo, mesmo banco — é crédito em conta, não transferência.
    const r = batchProfileFor(transferTo('001'), '1');
    assert.ok(isOk(r), `esperava ok, veio ${isErr(r) ? r.error : '?'}`);
    assert.equal(r.value.launchForm, '01');
  });

  // CA5. O caminho por omissão erra nos dois sentidos — TED para quem é de casa vira registro
  // recusado; crédito em conta para quem é de fora vira crédito que não sai. Recusar nomeando é a
  // única saída que não escolhe um dos dois erros.
  it('recusa favorecido sem banco legível, em vez de assumir uma das duas formas', () => {
    for (const bank of ['', '   ', 'ABC', '1234', 'Bradesco']) {
      const r = batchProfileFor(transferTo(bank), CEDENTE_BANK);
      assert.ok(isErr(r), `esperava erro para '${bank}'`);
      assert.equal(r.error, 'remittance-payee-bank-unreadable');
    }
  });
});

describe('Câmara centralizadora — função da forma, não escolha de quem monta (#751)', () => {
  // CA4. A tabela do manual (nota (2) de G029, p. 101) lista só as formas de TED; a ocorrência 'AK'
  // de G059 (p. 107) cobre o resto com zeros. Não há default a herdar: a função é TOTAL.
  it('as formas de TED transitam pela câmara de TED', () => {
    for (const tedForm of ['03', '41', '43']) assert.equal(clearingHouseFor(tedForm), '018');
    for (const other of ['01', '05', '30', '31']) assert.equal(clearingHouseFor(other), '000');
  });

  // #890, achado 2 — este caso assertava `45` → `000` até 01/09/2026, e era ele que fixava o defeito.
  //
  // O manual NÃO sustenta o `009`: a nota (2) do G029 tabula só as formas de TED, a descrição de
  // P001 (p. 132) enumera só `018` e `888`, e a string `009` não ocorre uma única vez no PDF. Quem
  // sustenta é o golden do banco (`GOLDEN_TEST_MULTIPAG_PIX_240`, 29/08/2026), que vale como verdade
  // por decisão do dono do repositório. As três asserções ficam JUNTAS de propósito: separá-las
  // deixaria alguém "corrigir" a do PIX lendo o manual, sem ver as outras duas ao lado.
  it('a forma de PIX transita pelo SPI, e as vizinhas não mudam por causa dela', () => {
    assert.equal(clearingHouseFor('45'), '009');
    assert.equal(clearingHouseFor('41'), '018');
    assert.equal(clearingHouseFor('01'), '000');
  });

  // Uma forma nova sai com zeros — nunca herdando a câmara da forma anterior, que é o modo de falha
  // que o default produzia.
  it('forma desconhecida sai com zeros, não com a câmara da forma vizinha', () => {
    assert.equal(clearingHouseFor('99'), '000');
  });

  // O domínio completo de G029 (p. 100-101). Serve à propriedade abaixo — as três formas de TED e a
  // de PIX são as únicas com câmara; todas as outras são zeros, e nenhuma delas é caso especial.
  const G029_DOMAIN = [
    '01',
    '02',
    '03',
    '04',
    '05',
    '10',
    '11',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
    '25',
    '26',
    '27',
    '30',
    '31',
    '40',
    '41',
    '43',
    '44',
    '45',
    '47',
    '50',
    '70',
    '71',
    '72',
    '73',
    '99',
  ] as const;

  // A totalidade da função está afirmada em três comentários do `batch-profile.ts` e, até aqui, era
  // provada por NENHUM teste: os casos acima cobrem 9 das 33 formas do G029, escolhidas a dedo. Foi
  // essa lacuna que deixou o `45` sair errado — ele não estava entre as 9, e quando entrou, entrou
  // com o valor errado (#890, achado 2).
  //
  // A tabela abaixo é DELIBERADAMENTE uma segunda escrita da que vive no `batch-profile.ts`. Derivá-la
  // do código faria o teste concordar consigo mesmo e não verificar nada; escrevê-la à parte é o que
  // faz uma alteração no emissor precisar de uma alteração aqui, visível no mesmo diff.
  const CLEARING_BY_FORM: ReadonlyMap<string, string> = new Map([
    ['03', '018'], // DOC/TED
    ['41', '018'], // TED outra titularidade
    ['43', '018'], // TED mesma titularidade
    ['45', '009'], // Pix Transferência — SPI, do golden do banco
  ]);

  // Partição: a pertinência é decidida por UM lugar só, e as 33 formas passam por ele. Uma forma
  // nova que ganhe câmara sem entrar no mapa reprova aqui; uma que perca, também.
  it('exatamente as formas de TED e a de PIX têm câmara — as outras 29 são zeros', () => {
    for (const form of G029_DOMAIN) {
      const expected = CLEARING_BY_FORM.get(form) ?? '000';
      assert.equal(clearingHouseFor(form), expected, `forma ${form}`);
    }
  });

  // Invariante, e ele pega uma classe que a partição não pega: valor FORA do domínio de P001. Foi
  // assim que um `988` (contra o `888` do manual, p. 132) viveu meses numa tabela de referência —
  // um dígito errado produz arquivo bem-formado que o banco recusa, e o `remittance-inspector.ts`
  // não vê, porque não é defeito de forma.
  //
  // As entradas fora do domínio de G029 estão aqui de propósito: totalidade que só vale para o
  // domínio conhecido não é totalidade, e o `launchForm` chega como `string`.
  it('devolve sempre um código do domínio de P001, para qualquer entrada', () => {
    const P001_DOMAIN: ReadonlySet<string> = new Set(['018', '009', '000']);

    for (const form of [...G029_DOMAIN, '', '  ', '4', '045', 'XX', '999', '45 ']) {
      const clearing = clearingHouseFor(form);
      assert.ok(
        P001_DOMAIN.has(clearing),
        `forma '${form}' devolveu '${clearing}', fora do domínio de P001`,
      );
    }
  });
});

/**
 * Finalidade da TED (P011, Segmento A, colunas 220-224) — #813.
 *
 * Mesma disciplina da câmara, um elo adiante: a forma de lançamento decide, e quem monta não opina.
 * Enquanto o campo foi opcional com `?? ''`, TODA remessa saía com as cinco posições em branco — o
 * arquivo que o Validador Universal recusou em 21/08/2026.
 *
 * O que este bloco fixa é a FUNÇÃO; o valor e as fontes que o sustentam estão junto da constante,
 * em `batch-profile.ts`.
 */
describe('Finalidade da TED — função da forma, como a câmara (#813)', () => {
  // CA1. As mesmas três formas que transitam por câmara de TED são as que levam finalidade: os dois
  // campos descrevem a mesma operação, e divergirem dentro de um registro é contradição.
  it('as formas de TED levam a finalidade, e só elas', () => {
    for (const tedForm of ['03', '41', '43']) assert.equal(tedPurposeFor(tedForm), '00005');
    for (const other of ['01', '05', '30', '31', '45']) assert.equal(tedPurposeFor(other), null);
  });

  // CA2, pendente do Validador Universal. Crédito em conta (`01`) sai SEM finalidade — `null`, que
  // significa "esta rota não tem o campo", e não "tem, e vai vazio". A decisão da P.O. (21/08) é
  // explicitamente não fixar valor aqui até duas submissões ao validador (220-224 em branco ×
  // preenchido) dizerem qual regra vale. Este teste guarda o status quo enquanto a resposta não vem.
  it('crédito em conta não declara finalidade — CA2 pendente do validador', () => {
    assert.equal(tedPurposeFor('01'), null);
  });

  // Total sobre o domínio de G029, como `clearingHouseFor`: forma nova entra pelo `else` e sai sem
  // finalidade, nunca herdando a da forma anterior.
  it('forma desconhecida sai sem finalidade, não com a da forma vizinha', () => {
    assert.equal(tedPurposeFor('99'), null);
  });

  // ⚠️ A armadilha que a #813 documenta, virada teste. O campo é declarado **Alfa** no layout, mas o
  // domínio é NUMÉRICO com zeros à esquerda: `text('5', 5)` produz `'5    '` — alinhado à esquerda,
  // completado com brancos —, que não é código nenhum. O valor tem de sair daqui com os cinco
  // caracteres literais, ou o campo mente com aparência de válido.
  it('produz os cinco caracteres literais, não um número a formatar depois', () => {
    assert.equal(tedPurposeFor('41'), '00005');
    assert.notEqual(tedPurposeFor('41'), '5');
    assert.equal(tedPurposeFor('41')?.length, 5);
  });
});

describe('P013 (225-226) — tipo da conta do favorecido, irmão da finalidade (inquiry-0033)', () => {
  // Medido no Validador Universal em 25/08: em TED o campo é obrigatório (`CC`/`PP`); em crédito em
  // conta é PROIBIDO — preenchido → recusa. As mesmas formas da câmara e da finalidade, pelo mesmo
  // motivo: os três campos descrevem a mesma operação e não podem divergir dentro de um registro.
  it('as formas de TED levam o tipo de conta, e só elas', () => {
    for (const tedForm of ['03', '41', '43']) assert.equal(complementPurposeFor(tedForm), 'CC');
    for (const other of ['01', '05', '30', '31', '45'])
      assert.equal(complementPurposeFor(other), null);
  });

  // ⚠️ ESTE é o teste que guarda a premissa, e ele existe para FALHAR quando a #817 entrar: quando o
  // cadastro do favorecido passar a guardar o tipo de conta, o valor deixa de ser constante e este
  // teste tem de ser reescrito — de propósito. Enquanto ele passa, a premissa está em vigor.
  //
  // PREMISSA (P.O., 25/08): conta corrente. O que a sustenta não é a raridade da poupança — é o
  // processo: o operador confere a classificação ANTES de gerar, e o título com tipo errado volta
  // RECUSADO do banco, com pagamento refeito fora da remessa. Erro detectável, com caminho de volta.
  it('a constante é a premissa vigente: conta corrente', () => {
    assert.equal(complementPurposeFor('41'), 'CC');
    assert.notEqual(complementPurposeFor('41'), 'PP');
  });

  // Total sobre o domínio, como os dois vizinhos: forma nova entra pelo `else` e sai SEM o campo,
  // nunca herdando o da forma anterior — e sair sem ele é o certo, porque fora de TED é proibido.
  it('forma desconhecida sai sem o campo, não com o da forma vizinha', () => {
    assert.equal(complementPurposeFor('99'), null);
  });

  // O campo é Alfa(2) e o domínio é fechado — `CC` ou `PP`, enunciados pelo banco na crítica de
  // 21/08. Duas posições exatas: `'C'` sairia `'C '` e o banco recusa apontando a coluna.
  it('produz exatamente dois caracteres', () => {
    assert.equal(complementPurposeFor('41')?.length, 2);
  });

  // A invariante que amarra os três campos: quem tem câmara de TED tem finalidade E tipo de conta.
  // Um trio que divergisse produziria arquivo recusado — foi assim que a #751 nasceu.
  it('câmara, finalidade e tipo de conta andam juntos — os três ou nenhum', () => {
    for (const form of ['01', '03', '05', '30', '31', '41', '43', '45', '99']) {
      const temFinalidade = tedPurposeFor(form) !== null;
      assert.equal(complementPurposeFor(form) !== null, temFinalidade);
    }
  });
});

describe('Perfil de lote — a forma do boleto sai do código de barras', () => {
  it('título do próprio banco e de outro banco recebem formas distintas', () => {
    const own = profile(billetOf(CEDENTE_BANK)).launchForm;
    const other = profile(billetOf('341')).launchForm;

    assert.notEqual(own, other);
  });

  it('a mesma forma sai para qualquer outro banco emissor', () => {
    assert.equal(profile(billetOf('341')).launchForm, profile(billetOf('001')).launchForm);
  });

  // Sem isto, um código de barras curto ou com letra escolheria a forma pelo lixo dos três
  // primeiros caracteres — e a escolha erra em silêncio, porque as duas formas produzem arquivo
  // bem-formado.
  it('recusa código de barras que não permite ler o banco emissor', () => {
    for (const barcode of ['', '23', 'ABC91234500000150000123456789012345678901234']) {
      assert.ok(isErr(batchProfileFor({ route: 'billet', barcode }, CEDENTE_BANK)), barcode);
    }
  });
});

describe('Perfil de lote — as rotas que ainda não têm emissor', () => {
  // O ponto da issue: o montador tratava todo pagamento como o par de crédito em conta. Um título
  // de PIX incluído numa seleção sairia como transferência, com dados bancários que aquela rota não
  // usa — arquivo bem-formado, aceito pelo banco, pagamento errado.
  it('recusa nomeando o motivo, em vez de cair no perfil de transferência', () => {
    for (const route of ['pix', 'tax-guide'] as const) {
      const r = batchProfileFor({ route }, CEDENTE_BANK);
      assert.ok(isErr(r), `esperava erro para ${route}`);
      assert.equal(r.error, 'remittance-launch-form-unsupported');
    }
  });
});
