import type { VanRoute } from '../../domain/payout/types.ts';

// Como a seleção se REPARTE em lotes, sem gerar arquivo (#804, CA7).
//
// POR QUE É UM PORT, e não uma função importada: o agrupamento é regra do LAYOUT bancário — o
// validador do Bradesco recusa lote cujos Segmentos A misturem favorecidos de bancos distintos —, e
// `application/` não pode importar `adapters/`. Trocar de banco é trocar o adapter injetado aqui,
// como já vale para o `CnabRemittanceTranslator`.
//
// POR QUE NÃO REUSAR o `CnabRemittanceTranslator`: o pré-voo é LEITURA PURA — não consome NSA, não
// prende título, não toca no bucket. Depender do tradutor traria junto montagem de arquivo, nome e
// inspeção estrutural, e um port de leitura passaria a declarar capacidade de emitir. Segregação de
// interface: quem só precisa saber como agrupa não deve poder gerar.
//
// ⚠️ O front NÃO deve replicar esta régua. Duas réguas divergem, e a divergência aparece como uma
// tela que descreve um arquivo diferente do que foi transmitido — pior que não ter pré-voo, porque
// o operador confirma acreditando ter conferido.

// O mínimo que decide o agrupamento. Deliberadamente menor que o pagamento inteiro: valor e data
// não participam da decisão, e quem recebe isto não deve poder consultá-los para decidir.
export type PlannablePayment = Readonly<{
  route: VanRoute;
  // Código do banco do favorecido, como o cadastro o entrega — pode vir sem zeros à esquerda, e a
  // normalização é do planejador. `null` quando a rota não tem favorecido bancário (boleto) ou
  // quando o cadastro não o resolve.
  payeeBankCode: string | null;
  // Código de barras do boleto: é dele que sai o banco emissor do título, e é o que separa
  // liquidação no próprio banco de liquidação em outro.
  barcode: string | null;
  valueCents: number;
}>;

export type PlanBatchesInput = Readonly<{
  // A conta que vai pagar. Sem ela a forma de lançamento é INDETERMINÁVEL: crédito em conta e TED
  // se distinguem comparando o banco do favorecido com o do cedente, e é por isso que o pré-voo
  // passou a exigir a conta-cedente (#804, CA7).
  cedenteBankCode: string;
  payments: readonly PlannablePayment[];
}>;

export type PlannedBatch = Readonly<{
  // G029, o código CNAB cru. Sobe como código, e não como rótulo, porque é o que o operador confere
  // contra o arquivo transmitido — a tradução para PT-BR acontece na borda HTTP, onde moram as
  // strings ao humano.
  launchForm: string;
  // `null` no boleto: o Segmento J não carrega banco de destino, então não há o que exibir.
  payeeBankCode: string | null;
  count: number;
  totalCents: number;
}>;

export type PlanBatchesResult = Readonly<{
  batches: readonly PlannedBatch[];
  // Quantos pagamentos da seleção NÃO entraram em lote algum, e quanto eles somam.
  //
  // O VALOR viaja junto com a contagem, e não é redundância: a soma dos lotes mais este total é a
  // seleção inteira, e é essa propriedade que faz a tela fechar. Sem ele o operador soma os lotes,
  // compara com o que selecionou, vê que não bate e não sabe QUANTO ficou de fora — a tela
  // levantaria a dúvida sem oferecer a resposta.
  //
  // Não carrega a CAUSA por pagamento de propósito: `PreviewLineStatus` já a diz linha a linha
  // (`blocked`, `out-of-van`, `not-approved`), e uma segunda régua para o mesmo fato divergiria da
  // primeira. Aqui o papel é fechar a aritmética do lote, não explicar o título.
  unplannedCount: number;
  unplannedTotalCents: number;
}>;

// Síncrono e sem `Result`: agrupar não faz I/O e não falha — um pagamento que não agrupa é
// contabilizado, não vira erro. Falhar aqui derrubaria o pré-voo inteiro por causa de um título,
// que é exatamente o oposto do que ele existe para fazer.
export type RemittanceBatchPlanner = Readonly<{
  planBatches: (input: PlanBatchesInput) => PlanBatchesResult;
}>;
