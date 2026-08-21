import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { planRemittanceBatches } from '#src/modules/financial/adapters/cnab/batch-planner.ts';
import type { PlannablePayment } from '#src/modules/financial/application/ports/remittance-batch-planner.ts';

// O planejador de lotes do pré-voo (#804, CA7).
//
// POR QUE EXISTE: a tela de confirmação precisa mostrar a data e o total de CADA lote antes de o
// operador confirmar, e o agrupamento é do emissor. Se o front replicasse a régua, existiriam duas
// — e a tela mentiria sobre o que o arquivo contém no dia em que divergissem.
//
// ⚠️ A régua é a MESMA de `remittance-file.ts`: forma de lançamento + banco do favorecido
// normalizado. Este módulo não a reimplementa; reusa `batchProfileFor` e a chave de agrupamento.
// Um teste que passasse aqui e falhasse lá seria a prova de que a duplicação voltou.

const CEDENTE_BANK = '237';

const transfer = (payeeBankCode: string, valueCents: number): PlannablePayment => ({
  route: 'transfer',
  payeeBankCode,
  barcode: null,
  valueCents,
});

const billet = (barcode: string, valueCents: number): PlannablePayment => ({
  route: 'billet',
  payeeBankCode: null,
  barcode,
  valueCents,
});

const plan = (payments: readonly PlannablePayment[]) =>
  planRemittanceBatches({ cedenteBankCode: CEDENTE_BANK, payments });

describe('Planejador de lotes — a mesma régua do emissor', () => {
  // O exemplo da própria #804: dois lotes, ambos TED, separados pelo banco do favorecido. O
  // validador do Bradesco recusa lote cujos Segmentos A misturem bancos distintos.
  it('separa favorecidos de bancos distintos em lotes próprios', () => {
    const result = plan([transfer('260', 100_00), transfer('555', 400_00), transfer('260', 23_25)]);

    assert.equal(result.batches.length, 2);
    assert.deepEqual(
      result.batches.map((b) => ({ bank: b.payeeBankCode, count: b.count, total: b.totalCents })),
      [
        { bank: '260', count: 2, total: 123_25 },
        { bank: '555', count: 1, total: 400_00 },
      ],
    );
  });

  // Mesmo banco, ainda que intercalados na seleção: um lote só. A ordem dos lotes segue a PRIMEIRA
  // APARIÇÃO de cada chave, como no montador — dois pré-voos da mesma seleção têm de coincidir.
  it('mantém favorecidos do mesmo banco num lote só e preserva a ordem de aparição', () => {
    const result = plan([transfer('341', 10_00), transfer('033', 20_00), transfer('341', 30_00)]);

    assert.equal(result.batches.length, 2);
    assert.deepEqual(
      result.batches.map((b) => b.payeeBankCode),
      ['341', '033'],
    );
    assert.equal(result.batches[0]?.count, 2);
  });

  // O zero à esquerda é do CAMPO, não do banco: `33` e `033` são o mesmo destino e escrevem as
  // mesmas posições 021-023. Chaves cruas partiriam um lote legítimo em dois.
  //
  // ⚠️ O par tem DOIS e TRÊS dígitos de propósito. `normalizeBankCode` aceita `^\d{1,3}$` — um
  // código de quatro dígitos não é "o mesmo banco com zero a mais", é entrada inválida, e o
  // cadastro que a contiver cai como não-planejável em vez de agrupar por engano.
  it('normaliza o código do banco antes de agrupar', () => {
    const result = plan([transfer('33', 10_00), transfer('033', 20_00)]);

    assert.equal(result.batches.length, 1);
    assert.equal(result.batches[0]?.payeeBankCode, '033');
    assert.equal(result.batches[0]?.totalCents, 30_00);
  });

  // Favorecido no MESMO banco do cedente não é TED: o crédito é interno, e a forma difere. É a
  // razão de o pré-voo precisar saber QUAL conta-cedente vai pagar.
  it('distingue crédito em conta de TED pela comparação com o banco do cedente', () => {
    const result = plan([transfer(CEDENTE_BANK, 10_00), transfer('341', 20_00)]);

    assert.equal(result.batches.length, 2);
    const forms = result.batches.map((b) => b.launchForm);
    assert.notEqual(forms[0], forms[1], 'mesmo banco e outro banco não compartilham forma');
  });

  // O boleto não tem favorecido bancário — quem recebe está no código de barras, e o Segmento J não
  // carrega banco de destino. Para ele a forma é a chave inteira.
  it('agrupa boleto pela forma, sem banco de favorecido', () => {
    const result = plan([billet('2'.repeat(44), 50_00)]);

    assert.equal(result.batches.length, 1);
    assert.equal(result.batches[0]?.payeeBankCode, null);
    assert.equal(result.batches[0]?.totalCents, 50_00);
  });

  it('devolve nenhum lote para seleção vazia, em vez de um lote vazio', () => {
    assert.deepEqual(plan([]).batches, []);
  });
});

describe('Planejador de lotes — o que NÃO entra em lote algum', () => {
  // A diferença de postura em relação ao montador: ele aborta o arquivo inteiro quando um
  // pagamento não tem emissor — certo para gerar, porque remessa parcial pagaria uns fornecedores
  // e silenciaria outros. O pré-voo não pode abortar: ele existe para mostrar o que não sai.
  //
  // ⚠️ O VALOR viaja junto com a contagem, e não é redundância. Sem ele, o operador soma os lotes,
  // compara com o total da seleção, vê que não fecha e não sabe QUANTO ficou de fora — a tela
  // levantaria a dúvida sem oferecer a resposta. A #804 pede uma tela cujos totais fechem.
  it('contabiliza rota sem emissor com o valor que ficou de fora', () => {
    const result = plan([
      transfer('341', 100_00),
      { route: 'pix', payeeBankCode: null, barcode: null, valueCents: 70_00 },
    ]);

    assert.equal(result.batches.length, 1);
    assert.equal(result.batches[0]?.totalCents, 100_00);
    assert.equal(result.unplannedCount, 1);
    assert.equal(result.unplannedTotalCents, 70_00);
  });

  // Cadastro sem banco do favorecido: o título existe e tem valor, mas não há forma a derivar.
  // Cai no mesmo balde, e o valor conta igual.
  it('contabiliza favorecido sem banco no cadastro', () => {
    const result = plan([
      { route: 'transfer', payeeBankCode: null, barcode: null, valueCents: 30_00 },
      transfer('341', 10_00),
    ]);

    assert.equal(result.unplannedCount, 1);
    assert.equal(result.unplannedTotalCents, 30_00);
  });

  // Banco ilegível é distinto de banco ausente na origem, mas o desfecho aqui é o mesmo: sem
  // código normalizável não há lote. `normalizeBankCode` aceita `^\d{1,3}$` — nome de banco em
  // texto livre, que é como o cadastro guarda, não passa.
  it('contabiliza banco que não normaliza, em vez de agrupar pelo código cru', () => {
    const result = plan([transfer('BRADESCO', 25_00), transfer('341', 10_00)]);

    assert.equal(result.batches.length, 1);
    assert.equal(result.unplannedCount, 1);
    assert.equal(result.unplannedTotalCents, 25_00);
  });

  // A soma tem de fechar: total dos lotes + total não planejado = total da seleção. É a
  // propriedade que a tela usa, e o motivo de (b) existir.
  it('os lotes mais o não planejado somam a seleção inteira', () => {
    const payments = [
      transfer('341', 100_00),
      transfer('033', 50_00),
      { route: 'tax-guide' as const, payeeBankCode: null, barcode: null, valueCents: 7_00 },
      transfer('341', 25_00),
    ];
    const result = plan(payments);

    const inBatches = result.batches.reduce((sum, b) => sum + b.totalCents, 0);
    const selection = payments.reduce((sum, p) => sum + p.valueCents, 0);

    assert.equal(inBatches + result.unplannedTotalCents, selection);
  });

  it('seleção inteiramente planejável não reporta valor de fora', () => {
    const result = plan([transfer('341', 10_00)]);

    assert.equal(result.unplannedCount, 0);
    assert.equal(result.unplannedTotalCents, 0);
  });
});
