// Planejador de lotes do pré-voo: como a seleção se REPARTE, sem gerar arquivo (#804, CA7).
//
// Reusa `batchProfileFor` e `batchKeyFor` — as MESMAS funções que o montador usa. Não reimplementa
// nada: se este módulo e `remittance-file.ts` discordassem, a tela descreveria um arquivo diferente
// do transmitido, e o operador confirmaria acreditando ter conferido.
//
// A diferença em relação ao montador é de POSTURA, não de régua. `groupIntoBatches` aborta o
// arquivo inteiro quando um pagamento não tem emissor — correto para gerar, porque remessa parcial
// pagaria parte dos fornecedores e silenciaria o resto. Aqui é o oposto: o pré-voo existe para
// mostrar o que NÃO sai, título a título, e um erro em bloco diria apenas que algo está errado em
// algum lugar. É a mesma separação que já distingue `RemittancePreviewReader` de
// `RemittancePaymentReader`.
import { batchKeyFor, batchProfileFor, normalizeBankCode } from './batch-profile.ts';
import type { ProfiledPayment } from './batch-profile.ts';
import type {
  PlanBatchesInput,
  PlanBatchesResult,
  PlannablePayment,
  PlannedBatch,
  RemittanceBatchPlanner,
} from '../../application/ports/remittance-batch-planner.ts';

// Do pagamento do pré-voo para o mínimo que decide o perfil. O boleto declara o código de barras
// porque é dele que sai o banco emissor do título; a transferência declara o banco do favorecido.
// Sem o dado que a rota exige, não há perfil a derivar — e o `null` é tratado adiante.
const profiledOf = (payment: PlannablePayment): ProfiledPayment | null => {
  switch (payment.route) {
    case 'transfer':
      return payment.payeeBankCode === null
        ? null
        : { route: 'transfer', payeeBankCode: payment.payeeBankCode };
    case 'billet':
      return payment.barcode === null ? null : { route: 'billet', barcode: payment.barcode };
    case 'pix':
      return { route: 'pix' };
    case 'tax-guide':
      return { route: 'tax-guide' };
  }
};

// Acumulador de um lote em formação. Mutável e confinado a esta função: é somatória, não valor de
// domínio.
interface OpenBatch {
  launchForm: string;
  payeeBankCode: string | null;
  count: number;
  totalCents: number;
}

export const planRemittanceBatches = (input: PlanBatchesInput): PlanBatchesResult => {
  // A ordem é parte do contrato: os lotes saem na ordem de PRIMEIRA APARIÇÃO de cada chave na
  // seleção, exatamente como `groupIntoBatches` os numera. Uma ordenação implícita — alfabética,
  // por valor — faria o pré-voo listar o lote 2 como primeiro, e o operador conferiria contra o
  // arquivo errado.
  // `Map` itera na ordem de INSERÇÃO, então a primeira aparição de cada chave define a posição do
  // lote sem precisar de um array paralelo de ordem.
  const byKey = new Map<string, OpenBatch>();
  let unplannedCount = 0;
  let unplannedTotalCents = 0;

  for (const payment of input.payments) {
    const profiled = profiledOf(payment);
    const profile = profiled === null ? null : batchProfileFor(profiled, input.cedenteBankCode);

    // O pagamento que não entra em lote algum é CONTABILIZADO — nunca aborta, nunca some.
    //
    // Três causas chegam aqui e caem no mesmo balde de propósito: rota sem emissor (`pix`,
    // `tax-guide`), cadastro sem banco do favorecido ou com banco ilegível, e boleto com código de
    // barras ilegível. O montador aborta o arquivo em qualquer uma delas — certo para gerar, porque
    // remessa parcial pagaria uns fornecedores e silenciaria o resto. Aqui é o oposto: o pré-voo
    // existe para mostrar o que NÃO sai.
    //
    // A CAUSA não viaja neste retorno, e a omissão é deliberada: `PreviewLineStatus` já a diz por
    // título (`blocked`, `out-of-van`, `not-approved`), e uma segunda régua para o mesmo fato
    // divergiria da primeira. O papel deste número é fechar a ARITMÉTICA — lotes + não planejado =
    // seleção —, e é essa propriedade que impede a tela de mentir sobre o que vai ser pago.
    //
    // Comparação explícita com `true`, e não `!profile?.ok`: o encadeamento produz
    // `boolean | undefined`, que `strict-boolean-expressions` recusa em condicional — com razão,
    // porque "sem perfil" e "perfil que falhou" são estados distintos que a negação achataria.
    if (profile?.ok !== true) {
      unplannedCount += 1;
      unplannedTotalCents += payment.valueCents;
      continue;
    }

    const isTransfer = payment.route === 'transfer';
    const key = batchKeyFor(isTransfer, profile.value.launchForm, payment.payeeBankCode);
    const open = byKey.get(key);

    if (open === undefined) {
      byKey.set(key, {
        launchForm: profile.value.launchForm,
        // Normalizado para EXIBIÇÃO pelo mesmo caminho do agrupamento: mostrar `0341` numa tela
        // cujo lote foi formado por `341` faria o operador procurar dois lotes onde há um.
        payeeBankCode: isTransfer ? normalizeBankCode(payment.payeeBankCode ?? '') : null,
        count: 1,
        totalCents: payment.valueCents,
      });
      continue;
    }

    open.count += 1;
    open.totalCents += payment.valueCents;
  }

  const batches: readonly PlannedBatch[] = [...byKey.values()].map((b) => ({
    launchForm: b.launchForm,
    payeeBankCode: b.payeeBankCode,
    count: b.count,
    totalCents: b.totalCents,
  }));

  return { batches, unplannedCount, unplannedTotalCents };
};

export const createRemittanceBatchPlanner = (): RemittanceBatchPlanner => ({
  planBatches: planRemittanceBatches,
});
