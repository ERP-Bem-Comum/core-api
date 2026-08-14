import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
// W0 RED: o perfil de lote ainda não existe.
import {
  batchProfileFor,
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

const transfer: ProfiledPayment = { route: 'transfer' };

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

  // Coerência dentro do próprio registro: o manual liga a câmara que o Segmento A já emite às
  // formas de TED (nota (2) da descrição da forma de lançamento). Crédito em conta com câmara de
  // TED seria contradição — e era o que o chamador podia produzir informando a forma por fora.
  it('a transferência declara forma de TED, coerente com a câmara do Segmento A', () => {
    assert.equal(profile(transfer).launchForm, '41');
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
