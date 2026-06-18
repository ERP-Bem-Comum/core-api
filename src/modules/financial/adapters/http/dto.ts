/**
 * Mapeadores domínio → DTO HTTP do módulo financial.
 *
 * Money é serializado como string de centavos (bigint não é JSON-safe — contracts/financial-http.md §Schemas).
 * Datas são ISO 8601 strings. IDs branded são coercidos para string.
 *
 * Espelha o padrão de contracts/adapters/http/contract-dto.ts.
 */

import type { Document } from '../../domain/document/types.ts';
import type { DocumentListItem } from '../../domain/document/query.ts';
import type { Payables } from '../../domain/payable/types.ts';
import type { FinancialTimelineEntry } from '../../domain/timeline/types.ts';
import type { StatementTransaction } from '../../domain/statement/types.ts';
import type {
  DocumentResponseDto,
  DocumentSummaryDto,
  DocumentTimelineResponseDto,
  StatementTransactionsResponseDto,
} from './schemas.ts';

/** Serializa Money (branded { cents: number }) como string de centavos. */
const moneyToCentsString = (cents: number): string => String(cents);

/**
 * Mapeia um StoredDocument (Document + Payables | null) para o DTO de resposta completo.
 * `payables` é null apenas em Draft — nesse caso devolve array vazio.
 * `version` (FR-009/optimistic lock): lido de `LoadedDocument.version` e incluído na resposta
 * para que o cliente reenvie no próximo PATCH/approve/undo-approval.
 */
export const documentToDto = (
  document: Document,
  payables: Payables | null,
  version: number,
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
      version,
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
    version,
  };
};

/**
 * Mapeia o read-model leve `DocumentListItem` (findPaged) para o item da listagem.
 * Usado pelo GET /documents — sem payables (payload enxuto, FR-004).
 * `version` (FR-009): exposto para ações inline no grid do front sem findById extra.
 */
export const listItemToSummaryDto = (item: DocumentListItem): DocumentSummaryDto => ({
  id: item.id,
  status: item.status,
  documentNumber: item.documentNumber,
  type: item.type,
  supplierRef: item.supplierRef,
  series: item.series,
  grossValueCents: item.grossValue !== null ? moneyToCentsString(item.grossValue.cents) : null,
  paymentMethod: item.paymentMethod,
  contractRef: item.contractRef,
  netValueCents: item.netValue !== null ? moneyToCentsString(item.netValue.cents) : null,
  dueDate: item.dueDate !== null ? item.dueDate.toISOString().slice(0, 10) : null,
  version: item.version,
  // Fornecedor resolvido do read-model local (#47/US2).
  supplierName: item.supplierName,
  supplierDocument: item.supplierDocument,
});

/**
 * Serializa a trilha por-campo (Time Travel) para o DTO de resposta.
 * IDs branded são coercidos para string; Date → ISO 8601; actor null preservado.
 */
export const timelineToDto = (
  entries: readonly FinancialTimelineEntry[],
): DocumentTimelineResponseDto => ({
  entries: entries.map((entry) => ({
    eventType: entry.eventType,
    target: {
      kind: entry.target.kind,
      id: String(entry.target.id),
    },
    occurredAt: entry.occurredAt.toISOString(),
    actor: entry.actor !== null ? String(entry.actor) : null,
    changes: entry.changes.map((c) => ({
      field: c.field,
      before: c.before,
      after: c.after,
    })),
  })),
});

/**
 * Serializa as transações de um extrato (US1 conciliação) para o DTO de resposta.
 * IDs/FITID branded → string; Date → ISO 8601; valores em string de centavos (assinado tolerado).
 */
export const statementTransactionsToDto = (
  transactions: readonly StatementTransaction[],
): StatementTransactionsResponseDto => ({
  items: transactions.map((t) => ({
    id: String(t.id),
    fitid: String(t.fitid),
    date: t.date.toISOString(),
    movement: t.movement,
    entryType: t.entryType,
    payeeName: t.payeeName,
    memo: t.memo,
    valueCents: String(t.valueCents),
    balanceAfterCents: String(t.balanceAfterCents),
    reconciliationStatus: t.reconciliationStatus,
  })),
});
