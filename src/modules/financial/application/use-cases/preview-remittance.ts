import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
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

export type PreviewLineStatus = 'ready' | 'blocked' | 'out-of-van' | 'not-found';

export type RemittancePreviewLine = Readonly<{
  documentId: string;
  status: PreviewLineStatus;
  route: VanRoute | null;
  // Campos a resolver, em LISTA — é o que o front usa para apontar o input. Uma mensagem de texto
  // obrigaria a interface a interpretar prosa para saber onde levar o operador.
  missing: readonly PayoutField[];
  // As lacunas com o motivo junto: `missing` pede preenchimento, `unmappable`/`malformed` pedem
  // correção do que já está lá. O operador age diferente em cada caso.
  gaps: readonly PayoutGap[];
  netValueCents: number;
}>;

export type RemittancePreview = Readonly<{
  lines: readonly RemittancePreviewLine[];
  readyCount: number;
  blockedCount: number;
  outOfVanCount: number;
  notFoundCount: number;
  readyTotalCents: number;
  blockedTotalCents: number;
}>;

export type PreviewRemittanceDeps = Readonly<{ preview: RemittancePreviewReader }>;

export type PreviewRemittanceInput = Readonly<{ documentIds: readonly string[] }>;

export type PreviewRemittanceError = 'remittance-preview-unavailable';

const NOT_FOUND = (documentId: string): RemittancePreviewLine => ({
  documentId,
  status: 'not-found',
  route: null,
  missing: [],
  gaps: [],
  netValueCents: 0,
});

const evaluate = (row: RemittancePreviewRow): RemittancePreviewLine => {
  // Documento sem forma de pagamento (Draft) não tem rota: cai em `out-of-van` pelo mesmo caminho
  // de câmbio e cartão — não há campo do favorecido que o torne apto.
  if (row.paymentMethod === null) {
    return {
      documentId: row.documentId,
      status: 'out-of-van',
      route: null,
      missing: [],
      gaps: [],
      netValueCents: row.netValueCents,
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
        documentId: row.documentId,
        status: 'ready',
        route: readiness.route,
        missing: [],
        gaps: [],
        netValueCents: row.netValueCents,
      };
    case 'incomplete':
      return {
        documentId: row.documentId,
        status: 'blocked',
        route: readiness.route,
        missing: readiness.gaps.map((g) => g.field),
        gaps: readiness.gaps,
        netValueCents: row.netValueCents,
      };
    case 'out-of-van':
      return {
        documentId: row.documentId,
        status: 'out-of-van',
        route: null,
        missing: [],
        gaps: [],
        netValueCents: row.netValueCents,
      };
  }
};

const sumWhere = (lines: readonly RemittancePreviewLine[], status: PreviewLineStatus): number =>
  lines.reduce((total, l) => (l.status === status ? total + l.netValueCents : total), 0);

const countWhere = (lines: readonly RemittancePreviewLine[], status: PreviewLineStatus): number =>
  lines.filter((l) => l.status === status).length;

export const previewRemittance =
  (deps: PreviewRemittanceDeps) =>
  async (
    input: PreviewRemittanceInput,
  ): Promise<Result<RemittancePreview, PreviewRemittanceError>> => {
    const rows = await deps.preview.loadPreviewRows(input.documentIds);
    if (!rows.ok) return err('remittance-preview-unavailable');

    const byId = new Map(rows.value.map((r) => [r.documentId, r]));

    // Percorre a SELEÇÃO, não o resultado da leitura: um id que o reader não devolveu tem de
    // aparecer como `not-found`. Iterar sobre as linhas encontradas faria o documento sumir do
    // pré-voo sem explicação — o defeito que este use case existe para corrigir.
    const lines = input.documentIds.map((id) => {
      const row = byId.get(id);
      return row === undefined ? NOT_FOUND(id) : evaluate(row);
    });

    return ok({
      lines,
      readyCount: countWhere(lines, 'ready'),
      blockedCount: countWhere(lines, 'blocked'),
      outOfVanCount: countWhere(lines, 'out-of-van'),
      notFoundCount: countWhere(lines, 'not-found'),
      readyTotalCents: sumWhere(lines, 'ready'),
      // O valor fora da VAN fica FORA dos dois totais. Somá-lo ao impedido inflaria o número que o
      // operador usa para decidir se vale correr atrás do cadastro — e cadastro nenhum resolve
      // câmbio.
      blockedTotalCents: sumWhere(lines, 'blocked'),
    });
  };
