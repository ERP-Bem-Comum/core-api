/**
 * Mapeadores domínio → DTO HTTP do módulo financial.
 *
 * Money é serializado como string de centavos (bigint não é JSON-safe — contracts/financial-http.md §Schemas).
 * Datas são ISO 8601 strings. IDs branded são coercidos para string.
 *
 * Espelha o padrão de contracts/adapters/http/contract-dto.ts.
 */

import type { Document } from '../../domain/document/types.ts';
import type { Payables } from '../../domain/payable/types.ts';
import type { DocumentResponseDto, DocumentSummaryDto } from './schemas.ts';

/** Serializa Money (branded { cents: number }) como string de centavos. */
const moneyToCentsString = (cents: number): string => String(cents);

/**
 * Mapeia um StoredDocument (Document + Payables | null) para o DTO de resposta completo.
 * `payables` é null apenas em Draft — nesse caso devolve array vazio.
 */
export const documentToDto = (
  document: Document,
  payables: Payables | null,
): DocumentResponseDto => {
  const payableItems =
    payables === null
      ? []
      : [payables.parent, ...payables.children].map((p) => ({
          id: String(p.id),
          kind: p.kind,
          retentionType: p.retentionType ?? null,
          valueCents: moneyToCentsString(p.value.cents),
          status: p.status,
        }));

  if (document.status === 'Draft') {
    return {
      id: String(document.id),
      status: document.status,
      documentNumber: document.documentNumber,
      type: document.type,
      supplierRef: document.supplier !== null ? String(document.supplier) : null,
      paymentMethod: document.paymentMethod,
      grossValueCents:
        document.grossValue !== null ? moneyToCentsString(document.grossValue.cents) : null,
      netValueCents: null, // Draft não tem líquido calculado
      dueDate: document.dueDate !== null ? document.dueDate.toISOString().slice(0, 10) : null,
      description: document.description,
      payables: payableItems,
    };
  }

  // Open | Approved
  return {
    id: String(document.id),
    status: document.status,
    documentNumber: document.documentNumber,
    type: document.type,
    supplierRef: String(document.supplier),
    paymentMethod: document.paymentMethod,
    grossValueCents: moneyToCentsString(document.grossValue.cents),
    netValueCents: moneyToCentsString(document.netValue.cents),
    dueDate: document.dueDate.toISOString().slice(0, 10),
    description: document.description,
    payables: payableItems,
  };
};

/**
 * Mapeia um Document para o item resumido da listagem.
 * Usado pelo GET /documents — sem payables para manter o payload enxuto.
 */
export const documentToSummaryDto = (document: Document): DocumentSummaryDto => {
  if (document.status === 'Draft') {
    return {
      id: String(document.id),
      status: document.status,
      documentNumber: document.documentNumber,
      type: document.type,
      supplierRef: document.supplier !== null ? String(document.supplier) : null,
      netValueCents: null,
      dueDate: document.dueDate !== null ? document.dueDate.toISOString().slice(0, 10) : null,
    };
  }

  return {
    id: String(document.id),
    status: document.status,
    documentNumber: document.documentNumber,
    type: document.type,
    supplierRef: String(document.supplier),
    netValueCents: moneyToCentsString(document.netValue.cents),
    dueDate: document.dueDate.toISOString().slice(0, 10),
  };
};
