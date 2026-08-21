import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { isApprovedForRemittance } from '../../domain/document/remittance-approval.ts';
import { checkPayoutReadiness } from '../../domain/payout/payout-readiness.ts';
import type { PayoutGap, PayoutField, VanRoute } from '../../domain/payout/types.ts';
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

// `not-approved` é distinto de `blocked` de propósito (#736): `blocked` diz "falta dado do
// cadastro" e manda o operador ao cadastro; `not-approved` diz "falta aprovar" e o manda ao fluxo
// de aprovação. Ação diferente, status diferente.
export type PreviewLineStatus = 'ready' | 'blocked' | 'out-of-van' | 'not-found' | 'not-approved';

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
  outOfVanCount: number;
  notFoundCount: number;
  notApprovedCount: number;
  readyTotalCents: number;
  blockedTotalCents: number;
}>;

export type PreviewRemittanceDeps = Readonly<{ preview: RemittancePreviewReader }>;

export type PreviewRemittanceInput = Readonly<{ payableIds: readonly string[] }>;

export type PreviewRemittanceError = 'remittance-preview-unavailable';

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

export const previewRemittance =
  (deps: PreviewRemittanceDeps) =>
  async (
    input: PreviewRemittanceInput,
  ): Promise<Result<RemittancePreview, PreviewRemittanceError>> => {
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

    return ok({
      lines,
      readyCount: countWhere(lines, 'ready'),
      blockedCount: countWhere(lines, 'blocked'),
      outOfVanCount: countWhere(lines, 'out-of-van'),
      notFoundCount: countWhere(lines, 'not-found'),
      notApprovedCount: countWhere(lines, 'not-approved'),
      readyTotalCents: sumWhere(lines, 'ready'),
      // O valor fora da VAN fica FORA dos dois totais. Somá-lo ao impedido inflaria o número que o
      // operador usa para decidir se vale correr atrás do cadastro — e cadastro nenhum resolve
      // câmbio.
      blockedTotalCents: sumWhere(lines, 'blocked'),
    });
  };
