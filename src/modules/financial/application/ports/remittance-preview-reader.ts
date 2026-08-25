import type { Result } from '../../../../shared/primitives/result.ts';
import type { DocumentStatus, PaymentMethod } from '../../domain/document/types.ts';
import type { PayeePaymentTarget } from '../../domain/payout/types.ts';

// Leitura CRUA para o pré-voo da remessa (#708, item 2 do adendo da P.O.).
//
// Por que não reusar o `RemittancePaymentReader`: ele é tudo-ou-nada por desenho. Devolve
// `RemittancePayeeData` já convertido e falha com `remittance-payment-incomplete` quando um único
// favorecido não converte — que é exatamente o certo para GERAR o arquivo, e exatamente o errado
// para o pré-voo. O operador precisa saber QUAL título está impedido e por quê; um erro em bloco
// diz apenas que algo está errado em algum lugar.
//
// Este port devolve o dado como ele está no cadastro, sem julgar. Quem julga é
// `checkPayoutReadiness`, no domínio — e é essa separação que permite ao pré-voo e à geração
// concordarem sempre: mesma regra, entradas idênticas.

export type RemittancePreviewRow = Readonly<{
  // Quem paga é o TÍTULO. A seleção do operador vem do grid de Contas a Pagar, que é
  // payable-centric — o pai de valor líquido e cada retenção são linhas próprias, com forma,
  // vencimento e ciclo de vida independentes.
  payableId: string;
  // A NOTA de origem, junto: o favorecido é dela (é dela o fornecedor), e o front usa para agrupar
  // no grid os títulos da mesma nota.
  documentId: string;
  // Status DO TÍTULO: só `Approved` entra em remessa (#736). Não-aprovado vira linha
  // `not-approved` — distinto de `blocked`, que é falta de dado do cadastro.
  status: DocumentStatus;
  paymentMethod: PaymentMethod | null; // null em Draft — o pré-voo trata como não apto
  paymentDetail: string | null; // código de barras do boleto ou da guia, DO TÍTULO
  // Valor DO TÍTULO — não o líquido da nota. Num filho de retenção os dois são grandezas
  // diferentes, e somar o líquido por linha multiplicaria o lote pelo número de retenções.
  valueCents: number;
  // Destino de pagamento do favorecido, cru. `null` quando o documento não tem favorecido
  // resolvível — distinto de favorecido COM bloco vazio, que devolve o objeto com campos nulos.
  payee: PayeePaymentTarget | null;
}>;

export type RemittancePreviewReaderError = 'remittance-preview-reader-unavailable';

export type RemittancePreviewReader = Readonly<{
  // Diferente do `loadPayments`, a ausência de um título NÃO é erro: a linha volta omitida e o
  // use case a reporta como `not-found`. Sumir com o id que o operador selecionou seria o mesmo
  // defeito que este pré-voo existe para corrigir.
  loadPreviewRows: (
    payableIds: readonly string[],
  ) => Promise<Result<readonly RemittancePreviewRow[], RemittancePreviewReaderError>>;
}>;
