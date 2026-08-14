import type { Result } from '../../../../shared/primitives/result.ts';
import type { RemittancePaymentInput } from './cnab-remittance-translator.ts';

// Dados de pagamento prontos para o tradutor, por documento.
//
// O documento NÃO carrega banco/agência/conta do favorecido: esse dado é do `partners`, e chega por
// composição (ADR-0032). O use case declara o que precisa; de onde vem é problema do adapter — e
// quando o BFF assumir a composição (ADR-0049), só o adapter muda.
//
// É o pagamento do tradutor mais a identidade do documento — uma união só, definida num lugar só.
// Reescrever aqui os membros por rota criaria a segunda definição do mesmo vocabulário, e duas
// definições divergem no dia em que uma rota ganhar campo.
export type RemittancePaymentData = Readonly<{ documentId: string }> & RemittancePaymentInput;

export type RemittancePaymentReaderError =
  | 'remittance-payment-reader-unavailable'
  | 'remittance-payment-incomplete';

export type RemittancePaymentReader = Readonly<{
  // Devolve UM item por documento pedido. Faltar algum é erro, nunca silêncio: montar remessa com
  // menos pagamentos do que o operador selecionou é pagar parte e calar sobre o resto.
  loadPayments: (
    documentIds: readonly string[],
  ) => Promise<Result<readonly RemittancePaymentData[], RemittancePaymentReaderError>>;
}>;
