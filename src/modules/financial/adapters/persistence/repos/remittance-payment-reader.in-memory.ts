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
    /**
     * Marca documentos como NÃO aprovados (#736). O adapter real deriva do `status` da linha; aqui,
     * como `RemittancePaymentData` é dado de emissão e não carrega status, a recusa é um conjunto
     * explícito — o fake precisa poder produzir `document-not-approved`, senão a barreira ficaria
     * sem cobertura de unidade e verde descrevendo produção errado.
     */
    setNotApproved: (documentIds: readonly string[]) => void;
  }>;

export const createInMemoryRemittancePaymentReader = (
  seedPayments: readonly RemittancePaymentData[] = [],
): InMemoryRemittancePaymentReader => {
  const payments = new Map<string, RemittancePaymentData>(
    seedPayments.map((p) => [p.documentId, p]),
  );
  let unavailable = false;
  const notApproved = new Set<string>();

  return {
    seed: (payment) => {
      payments.set(payment.documentId, payment);
    },
    setUnavailable: (value) => {
      unavailable = value;
    },
    setNotApproved: (documentIds) => {
      notApproved.clear();
      for (const id of documentIds) notApproved.add(id);
    },
    loadPayments: async (
      documentIds: readonly string[],
    ): Promise<Result<readonly RemittancePaymentData[], RemittancePaymentReaderError>> => {
      if (unavailable) return Promise.resolve(err('remittance-payment-reader-unavailable'));

      const found: RemittancePaymentData[] = [];
      for (const id of documentIds) {
        // Aprovação primeiro, como no adapter real: título não-aprovado recusa a chamada inteira
        // (tudo-ou-nada) com nome próprio, antes de qualquer conta de completude.
        if (notApproved.has(id)) return Promise.resolve(err('document-not-approved'));
        const payment = payments.get(id);
        if (payment === undefined) return Promise.resolve(err('remittance-payment-incomplete'));
        found.push(payment);
      }
      return Promise.resolve(ok(found));
    },
  };
};
