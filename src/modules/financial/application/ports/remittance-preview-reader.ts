import type { Result } from '../../../../shared/primitives/result.ts';
import type { PaymentMethod } from '../../domain/document/types.ts';
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
  documentId: string;
  paymentMethod: PaymentMethod | null; // null em Draft — o pré-voo trata como não apto
  paymentDetail: string | null; // linha digitável / código de barras (#273)
  netValueCents: number;
  // Destino de pagamento do favorecido, cru. `null` quando o documento não tem favorecido
  // resolvível — distinto de favorecido COM bloco vazio, que devolve o objeto com campos nulos.
  payee: PayeePaymentTarget | null;
}>;

export type RemittancePreviewReaderError = 'remittance-preview-reader-unavailable';

export type RemittancePreviewReader = Readonly<{
  // Diferente do `loadPayments`, a ausência de um documento NÃO é erro: a linha volta omitida e o
  // use case a reporta como `not-found`. Sumir com o id que o operador selecionou seria o mesmo
  // defeito que este pré-voo existe para corrigir.
  loadPreviewRows: (
    documentIds: readonly string[],
  ) => Promise<Result<readonly RemittancePreviewRow[], RemittancePreviewReaderError>>;
}>;
