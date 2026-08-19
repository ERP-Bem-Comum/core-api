import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: o perfil de lote ainda não existe.
import {
  batchProfileFor,
  clearingHouseFor,
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
  it('as formas de TED transitam pela câmara, e só elas', () => {
    for (const tedForm of ['03', '41', '43']) assert.equal(clearingHouseFor(tedForm), '018');
    for (const other of ['01', '05', '30', '31', '45'])
      assert.equal(clearingHouseFor(other), '000');
  });

  // Uma forma nova sai com zeros — nunca herdando a câmara da forma anterior, que é o modo de falha
  // que o default produzia.
  it('forma desconhecida sai com zeros, não com a câmara da forma vizinha', () => {
    assert.equal(clearingHouseFor('99'), '000');
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
