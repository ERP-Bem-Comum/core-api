import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import {
  isApprovedForRemittance,
  isTransmittedToVan,
} from '../../domain/document/remittance-approval.ts';
import { checkPayoutReadiness } from '../../domain/payout/payout-readiness.ts';
import type { PayoutGap, PayoutField, VanRoute } from '../../domain/payout/types.ts';
import type { CedenteAccountId } from '../../domain/cedente/cedente-account-id.ts';
import type { CedenteAccountStore } from '../ports/cedente-account-store.ts';
import type {
  PlannablePayment,
  PlannedBatch,
  RemittanceBatchPlanner,
} from '../ports/remittance-batch-planner.ts';
import type {
  RemittancePreviewReader,
  RemittancePreviewRow,
} from '../ports/remittance-preview-reader.ts';

// Pré-voo do lote: responde "o que sai e o que não sai" SEM gerar arquivo, sem alocar NSA e sem
// prender documento (#708, item 2 do adendo da P.O.).
//
// É o consumidor que faltava para `domain/payout/`. A mesma função que a geração usará para decidir
// é a que responde aqui — não uma segunda regra "de tela". Duas regras divergem, e a divergência
// aparece como título que o pré-voo aprova e o arquivo recusa, que é pior que não ter pré-voo.

// Cada status manda o operador a um lugar DIFERENTE, e é essa a régua que decide se um valor novo se
// justifica (#736): `blocked` diz "falta dado do cadastro" e o manda ao cadastro; `not-approved` diz
// "falta aprovar" e o manda ao fluxo de aprovação; `transmitted` (#792, ADR-0065 §5) diz "este já
// foi" e o manda à lista de remessas.
//
// ⚠️ `transmitted` não é preciosismo: sem ele um título já enviado cairia em `not-approved`, porque
// só `Approved` satisfaz `isApprovedForRemittance`. Seria verdade formal com mensagem errada — o
// operador iria aprovar um título que já está aprovado e cujo pagamento já saiu para o banco. E
// jamais `ready`: a recusa por `remittance-payables-already-held` chegaria no último clique, que é
// exatamente o defeito que o pré-voo existe para evitar (CA2 da #792).
//
// `no-issuer` é o sexto (#837), e passa na mesma régua: manda o operador RETIRAR O TÍTULO DA
// SELEÇÃO — lugar diferente dos outros cinco. Não é `blocked`, que o mandaria ao cadastro atrás de
// um dado que não falta; não é `out-of-van`, que é definitivo e diria "nunca sairá" sobre uma rota
// contratada na VAN cujo emissor só ainda não existe. Era exatamente este valor que faltava: sem
// ele, a Guia de Recolhimento aparecia como `ready` e a recusa chegava no último clique.
export type PreviewLineStatus =
  | 'ready'
  | 'blocked'
  | 'no-issuer'
  | 'out-of-van'
  | 'not-found'
  | 'not-approved'
  | 'transmitted';

export type RemittancePreviewLine = Readonly<{
  payableId: string;
  // A nota de origem. `null` em `not-found`: o título não foi encontrado, então não há nota a
  // declarar — inventar uma seria afirmar vínculo que não se leu.
  documentId: string | null;
  status: PreviewLineStatus;
  route: VanRoute | null;
  // Campos a resolver, em LISTA — é o que o front usa para apontar o input. Uma mensagem de texto
  // obrigaria a interface a interpretar prosa para saber onde levar o operador.
  missing: readonly PayoutField[];
  // As lacunas com o motivo junto: `missing` pede preenchimento, `unmappable`/`malformed` pedem
  // correção do que já está lá. O operador age diferente em cada caso.
  gaps: readonly PayoutGap[];
  // Valor DO TÍTULO. Num filho de retenção não é o líquido da nota, e chamá-lo `netValue` faria a
  // soma do lote parecer o total da nota multiplicado pelo número de retenções.
  valueCents: number;
}>;

export type RemittancePreview = Readonly<{
  lines: readonly RemittancePreviewLine[];
  readyCount: number;
  blockedCount: number;
  // #837: quantos da seleção têm cadastro completo mas rota que o arquivo ainda não emite. Contador
  // próprio, e não somado a `blockedCount`, pela mesma razão do `transmittedCount`: a ação do
  // operador é outra — retirar da seleção, não completar cadastro.
  noIssuerCount: number;
  outOfVanCount: number;
  notFoundCount: number;
  notApprovedCount: number;
  // #792: quantos da seleção já saíram numa remessa. Contador próprio, e não somado a
  // `notApprovedCount`, porque a ação do operador é outra — conferir a remessa, não aprovar.
  transmittedCount: number;
  readyTotalCents: number;
  blockedTotalCents: number;
  // Como a seleção se REPARTE no arquivo (#804, CA7). O agrupamento é do emissor, e o front não
  // deve replicá-lo: duas réguas divergem, e a divergência aparece como uma tela que descreve um
  // arquivo diferente do transmitido — pior que não ter pré-voo, porque o operador confirma
  // acreditando ter conferido.
  //
  // Só título `ready` entra: um impedido não vai no arquivo, e contá-lo prometeria um lote maior do
  // que o que seria enviado. A soma dos lotes é, por construção, `readyTotalCents`.
  batches: readonly PlannedBatch[];
  // O QUE NÃO ENTROU EM LOTE ALGUM (#948, CA5) — a metade que faltava para a tela fechar a conta.
  //
  // `planBatches` já os produzia e o pré-voo os DESCARTAVA: só `batches` subia. A tela ficava com os
  // lotes e a seleção, via que não batiam, e não tinha como dizer quanto ficou de fora — levantava a
  // dúvida sem oferecer a resposta. A propriedade que estes dois campos restauram é
  // `lotes + não planejado = seleção`, e é ela que impede a tela de mentir sobre o que vai ser pago.
  //
  // ⚠️ NÃO é `blockedCount` por outro nome, e confundi-los produz uma tela errada. Os contadores
  // acima classificam o TÍTULO pela ação do operador (completar cadastro, retirar da seleção,
  // aprovar); estes dois medem o LOTE — quantos dos selecionados o emissor não conseguiu agrupar.
  // Um título fora da VAN conta em `outOfVanCount` E aqui, porque as duas perguntas são diferentes:
  // "o que preciso fazer?" e "a soma dos lotes explica minha seleção?".
  unplannedCount: number;
  unplannedTotalCents: number;
}>;

export type PreviewRemittanceDeps = Readonly<{
  preview: RemittancePreviewReader;
  // A conta-cedente entra porque a forma de lançamento depende dela: crédito em conta e TED se
  // distinguem comparando o banco do favorecido com o do cedente. Sem isto não há lote a calcular.
  cedenteAccounts: CedenteAccountStore;
  batchPlanner: RemittanceBatchPlanner;
}>;

export type PreviewRemittanceInput = Readonly<{
  cedenteAccountId: CedenteAccountId;
  payableIds: readonly string[];
}>;

export type PreviewRemittanceError =
  | 'remittance-preview-unavailable'
  // Erro NOMEADO, e não lote vazio: sem a conta não há forma a derivar, e devolver `batches: []`
  // faria a tela afirmar que nada seria pago — uma mentira tranquilizadora sobre uma seleção que o
  // operador está prestes a confirmar.
  | 'cedente-account-not-found';

const notFoundLine = (payableId: string): RemittancePreviewLine => ({
  payableId,
  documentId: null,
  status: 'not-found',
  route: null,
  missing: [],
  gaps: [],
  valueCents: 0,
});

const toPreviewLine = (row: RemittancePreviewRow): RemittancePreviewLine => {
  // "Já foi" ANTES de "não está aprovado" (ADR-0065 §5), e a ordem é a mensagem: `Transmitted` não
  // satisfaz `isApprovedForRemittance`, então sem este ramo o título cairia logo abaixo em
  // `not-approved` — mandando o operador aprovar o que já está aprovado e já saiu para o banco.
  if (isTransmittedToVan(row.status)) {
    return {
      payableId: row.payableId,
      documentId: row.documentId,
      status: 'transmitted',
      route: null,
      missing: [],
      gaps: [],
      valueCents: row.valueCents,
    };
  }

  // Aprovação ANTES de tudo (#736): só título `Approved` entra em remessa. Vem primeiro porque um
  // não-aprovado não deve mandar o operador procurar cadastro nem forma de pagamento — o que falta é
  // a aprovação, e é o que a linha diz. `route` fica nulo: a rota não importa antes de aprovar.
  if (!isApprovedForRemittance(row.status)) {
    return {
      payableId: row.payableId,
      documentId: row.documentId,
      status: 'not-approved',
      route: null,
      missing: [],
      gaps: [],
      valueCents: row.valueCents,
    };
  }

  // Documento sem forma de pagamento (Draft) não tem rota: cai em `out-of-van` pelo mesmo caminho
  // de câmbio e cartão — não há campo do favorecido que o torne apto.
  if (row.paymentMethod === null) {
    return {
      payableId: row.payableId,
      documentId: row.documentId,
      status: 'out-of-van',
      route: null,
      missing: [],
      gaps: [],
      valueCents: row.valueCents,
    };
  }

  const readiness = checkPayoutReadiness({
    paymentMethod: row.paymentMethod,
    paymentDetail: row.paymentDetail,
    payee: row.payee,
  });

  switch (readiness.status) {
    case 'ready':
      return {
        payableId: row.payableId,
        documentId: row.documentId,
        status: 'ready',
        route: readiness.route,
        missing: [],
        gaps: [],
        valueCents: row.valueCents,
      };
    case 'incomplete':
      return {
        payableId: row.payableId,
        documentId: row.documentId,
        status: 'blocked',
        route: readiness.route,
        missing: readiness.gaps.map((g) => g.field),
        gaps: readiness.gaps,
        valueCents: row.valueCents,
      };
    // A rota VIAJA, ao contrário de `out-of-van`: ela é conhecida, e é o que permite à tela dizer
    // QUAL forma ainda não sai. `missing`/`gaps` ficam vazios porque não há campo a apontar — o
    // cadastro está completo, e oferecer um input levaria o operador a lugar nenhum.
    case 'no-issuer':
      return {
        payableId: row.payableId,
        documentId: row.documentId,
        status: 'no-issuer',
        route: readiness.route,
        missing: [],
        gaps: [],
        valueCents: row.valueCents,
      };
    case 'out-of-van':
      return {
        payableId: row.payableId,
        documentId: row.documentId,
        status: 'out-of-van',
        route: null,
        missing: [],
        gaps: [],
        valueCents: row.valueCents,
      };
  }
};

const sumWhere = (lines: readonly RemittancePreviewLine[], status: PreviewLineStatus): number =>
  lines.reduce((total, l) => (l.status === status ? total + l.valueCents : total), 0);

const countWhere = (lines: readonly RemittancePreviewLine[], status: PreviewLineStatus): number =>
  lines.filter((l) => l.status === status).length;

// Do título PRONTO para o mínimo que decide o agrupamento.
//
// `null` para tudo que não está `ready`, e é a regra inteira do que entra em lote: impedido,
// não-aprovado e fora-da-VAN não vão no arquivo. Derivar isto da linha já classificada — em vez de
// reclassificar aqui — é o que garante que a composição e o pré-voo nunca discordem.
// Soma em centavos de qualquer coleção que carregue `valueCents` — linha do pré-voo ou pagamento
// planejável. Uma função só porque as duas parcelas do CA5 precisam somar as duas listas pela MESMA
// régua: dois somadores dariam ao operador uma diferença que nenhuma das duas contas explica.
const sumOf = (items: readonly Readonly<{ valueCents: number }>[]): number =>
  items.reduce((total, item) => total + item.valueCents, 0);

const plannableOf = (
  line: RemittancePreviewLine,
  row: RemittancePreviewRow,
): PlannablePayment | null =>
  line.status === 'ready' && line.route !== null
    ? {
        route: line.route,
        payeeBankCode: row.payee?.bank ?? null,
        // O código de barras vive em `paymentDetail` no cadastro do título — é dele que sai o banco
        // emissor, e é o que separa boleto do próprio banco de boleto de outro.
        barcode: row.paymentDetail,
        valueCents: line.valueCents,
      }
    : null;

export const previewRemittance =
  (deps: PreviewRemittanceDeps) =>
  async (
    input: PreviewRemittanceInput,
  ): Promise<Result<RemittancePreview, PreviewRemittanceError>> => {
    // A conta ANTES da leitura dos títulos: sem ela não há composição a devolver, e falhar cedo
    // evita percorrer a seleção inteira para descartar o resultado no fim.
    const account = await deps.cedenteAccounts.findById(input.cedenteAccountId);
    if (!account.ok) return err('remittance-preview-unavailable');
    if (account.value === null) return err('cedente-account-not-found');

    const rows = await deps.preview.loadPreviewRows(input.payableIds);
    if (!rows.ok) return err('remittance-preview-unavailable');

    const byId = new Map(rows.value.map((r) => [r.payableId, r]));

    // Percorre a SELEÇÃO, não o resultado da leitura: um id que o reader não devolveu tem de
    // aparecer como `not-found`. Iterar sobre as linhas encontradas faria o título sumir do
    // pré-voo sem explicação — o defeito que este use case existe para corrigir.
    const lines = input.payableIds.map((id) => {
      const row = byId.get(id);
      return row === undefined ? notFoundLine(id) : toPreviewLine(row);
    });

    // A composição sai das MESMAS linhas já classificadas, e não de uma segunda passada sobre as
    // rows: reclassificar aqui criaria a chance de o lote incluir um título que a linha marcou como
    // impedido. Derivar da linha torna a concordância estrutural, não uma coincidência a manter.
    const plannable = lines.flatMap((line) => {
      const row = byId.get(line.payableId);
      const p = row === undefined ? null : plannableOf(line, row);
      return p === null ? [] : [p];
    });

    const planned = deps.batchPlanner.planBatches({
      cedenteBankCode: account.value.bankCode,
      payments: plannable,
    });

    return ok({
      lines,
      readyCount: countWhere(lines, 'ready'),
      blockedCount: countWhere(lines, 'blocked'),
      noIssuerCount: countWhere(lines, 'no-issuer'),
      outOfVanCount: countWhere(lines, 'out-of-van'),
      notFoundCount: countWhere(lines, 'not-found'),
      notApprovedCount: countWhere(lines, 'not-approved'),
      transmittedCount: countWhere(lines, 'transmitted'),
      readyTotalCents: sumWhere(lines, 'ready'),
      // O valor fora da VAN fica FORA dos dois totais. Somá-lo ao impedido inflaria o número que o
      // operador usa para decidir se vale correr atrás do cadastro — e cadastro nenhum resolve
      // câmbio.
      blockedTotalCents: sumWhere(lines, 'blocked'),
      batches: planned.batches,
      // #948 CA5 — "não planejado" tem DUAS origens, e somá-las é o que faz a conta fechar.
      //
      // ⚠️ O `unplannedCount` do planejador NÃO serve sozinho, e a armadilha é atraente: o nome é o
      // mesmo e o comentário dele promete `lotes + não planejado = seleção`. Só que a seleção que
      // ELE vê já passou por `plannableOf`, que retém apenas `ready` com rota. O número dele conta o
      // resíduo — título pronto que ainda assim não agrupou —, não o que o operador marcou e não vai
      // sair. Propagá-lo direto devolvia `0` para uma seleção com dois títulos impedidos.
      //
      // As duas parcelas vêm de fontes independentes, de propósito: uma é a diferença entre o que
      // foi selecionado e o que chegou ao planejador, a outra é o que o planejador recusou. Se as
      // duas etapas divergirem, a soma para de bater e o teste da aritmética acusa — que é o único
      // motivo de este número existir.
      unplannedCount: lines.length - plannable.length + planned.unplannedCount,
      unplannedTotalCents: sumOf(lines) - sumOf(plannable) + planned.unplannedTotalCents,
    });
  };
