// Adapter em memória do RemittancePaymentReader — testes e dev sem MySQL.
//
// Mantém o contrato tudo-ou-nada do port: id pedido e não semeado faz a chamada inteira falhar com
// `remittance-payment-incomplete`, como no adapter real. Um fake mais permissivo esconderia
// justamente o caso que a geração precisa recusar — montar remessa com menos títulos do que o
// operador selecionou.

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  RemittancePaymentData,
  RemittancePaymentReader,
  RemittancePaymentReaderError,
} from '#src/modules/financial/application/ports/remittance-payment-reader.ts';

export type InMemoryRemittancePaymentReader = RemittancePaymentReader &
  Readonly<{
    seed: (payment: RemittancePaymentData) => void;
    /** Simula o `partners` fora do ar — distinto de título incompleto, e o operador age diferente. */
    setUnavailable: (unavailable: boolean) => void;
  }>;

export const createInMemoryRemittancePaymentReader = (
  seedPayments: readonly RemittancePaymentData[] = [],
): InMemoryRemittancePaymentReader => {
  const payments = new Map<string, RemittancePaymentData>(
    seedPayments.map((p) => [p.documentId, p]),
  );
  let unavailable = false;

  return {
    seed: (payment) => {
      payments.set(payment.documentId, payment);
    },
    setUnavailable: (value) => {
      unavailable = value;
    },
    loadPayments: async (
      documentIds: readonly string[],
    ): Promise<Result<readonly RemittancePaymentData[], RemittancePaymentReaderError>> => {
      if (unavailable) return Promise.resolve(err('remittance-payment-reader-unavailable'));

      const found: RemittancePaymentData[] = [];
      for (const id of documentIds) {
        const payment = payments.get(id);
        if (payment === undefined) return Promise.resolve(err('remittance-payment-incomplete'));
        found.push(payment);
      }
      return Promise.resolve(ok(found));
    },
  };
};
