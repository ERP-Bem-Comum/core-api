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
import type { StatementView } from '../../domain/statement/statement-view.ts';
import { criteriaBreakdown } from '../../domain/reconciliation/match-score.ts';
import type { Reconciliation } from '../../domain/reconciliation/types.ts';
import type { ReconciliationPeriod } from '../../domain/reconciliation/period.ts';
import type { Category } from '../../domain/category/category.ts';
import type { CostCenter } from '../../domain/cost-center/cost-center.ts';
import type { ProgramView } from '../../application/ports/program-read.ts';
import type { PaidPayableView } from '../../application/ports/payable-reconciliation-view.ts';
import type { MatchSuggestion } from '../../application/use-cases/suggest-matches.ts';
import type { GetStatementSuggestionsOutput } from '../../application/use-cases/get-statement-suggestions.ts';
import type {
  AccountStatementResponseDto,
  TransactionReconciliationResponseDto,
  ReconciliationPeriodsResponseDto,
  StatementSuggestionsResponseDto,
  DocumentResponseDto,
  DocumentSummaryDto,
  DocumentTimelineResponseDto,
  PaidPayablesResponseDto,
  StatementTransactionsResponseDto,
  SuggestionsResponseDto,
  CategoryResponseDto,
  CostCenterResponseDto,
  ProgramResponseDto,
} from './schemas.ts';

/** Serializa Money (branded { cents: number }) como string de centavos. */
const moneyToCentsString = (cents: number): string => String(cents);

/** Categorias de referência (020 · US1) → DTO lean `{ id, name, group }`. Nunca expõe o row cru. */
export const categoriesToDto = (categories: readonly Category[]): CategoryResponseDto[] =>
  categories.map((c) => ({
    id: String(c.id),
    name: c.name,
    group: c.group,
    // Hierarquia (#147 F3): parentId branded é string em runtime — atribuição direta.
    parentId: c.parentId,
  }));

/** Centros de custo de referência (020 · US2) → DTO lean `{ id, code, name }`. */
export const costCentersToDto = (costCenters: readonly CostCenter[]): CostCenterResponseDto[] =>
  costCenters.map((c) => ({ id: String(c.id), code: c.code, name: c.name }));

/** Programas (020 · US3) → DTO lean `{ id, name }` (passthrough da fonte canônica). */
export const programsToDto = (programs: readonly ProgramView[]): ProgramResponseDto[] =>
  programs.map((p) => ({ id: p.id, name: p.name }));

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
      payeeKind: document.payeeKind,
      approverRef: document.approverRef,
      // Refs branded são strings em runtime — atribuição direta (cross-BC, #147).
      contractRef: document.contractRef,
      budgetPlanRef: document.budgetPlanRef,
      categoryRef: document.categoryRef,
      costCenterRef: document.costCenterRef,
      programRef: document.programRef,
      paymentMethod: document.paymentMethod,
      grossValueCents:
        document.grossValue !== null ? moneyToCentsString(document.grossValue.cents) : null,
      netValueCents: null, // Draft não tem líquido calculado
      dueDate: document.dueDate !== null ? document.dueDate.toISOString().slice(0, 10) : null,
      issueDate: document.issueDate !== null ? document.issueDate.toISOString().slice(0, 10) : null,
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
    payeeKind: document.payeeKind,
    approverRef: document.approverRef,
    // Refs branded são strings em runtime — atribuição direta (cross-BC, #147).
    contractRef: document.contractRef,
    budgetPlanRef: document.budgetPlanRef,
    categoryRef: document.categoryRef,
    costCenterRef: document.costCenterRef,
    programRef: document.programRef,
    paymentMethod: document.paymentMethod,
    grossValueCents: moneyToCentsString(document.grossValue.cents),
    netValueCents: moneyToCentsString(document.netValue.cents),
    dueDate: document.dueDate.toISOString().slice(0, 10),
    issueDate: document.issueDate !== null ? document.issueDate.toISOString().slice(0, 10) : null,
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
  issueDate: item.issueDate !== null ? item.issueDate.toISOString().slice(0, 10) : null,
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

/** Serializa os títulos `Paid` (GET /payables?status=Paid). valueCents em string; dueDate ISO (data). */
export const paidPayablesToDto = (views: readonly PaidPayableView[]): PaidPayablesResponseDto => ({
  items: views.map((v) => ({
    id: v.id,
    documentId: v.documentId,
    valueCents: String(v.valueCents),
    dueDate: v.dueDate.toISOString().slice(0, 10),
    paymentMethod: v.paymentMethod,
  })),
});

/** Serializa as sugestões de match (US2). score branded → number; band já é alta|media (baixa filtrada). */
export const suggestionsToDto = (
  suggestions: readonly MatchSuggestion[],
): SuggestionsResponseDto => ({
  suggestions: suggestions.map((s) => ({
    payableId: s.payableId,
    score: s.score,
    band: s.band,
    criteria: {
      payeeMatch: s.criteria.payeeMatch,
      exactValue: s.criteria.exactValue,
      dateD0: s.criteria.dateD0,
      memoRef: s.criteria.memoRef,
      supplierOpenCount: s.criteria.supplierOpenCount,
    },
    criteriaBreakdown: criteriaBreakdown(s.criteria).map((c) => ({
      criterion: c.criterion,
      weight: c.weight,
      result: c.result,
      detail: c.detail,
    })),
  })),
});

/** Serializa o read-model do extrato (#139). Money em string (convenção); datas em ISO. */
export const accountStatementToDto = (view: StatementView): AccountStatementResponseDto => ({
  openingBalanceCents: String(view.openingBalanceCents),
  closingBalanceCents: String(view.closingBalanceCents),
  counters: {
    all: view.counters.all,
    in: view.counters.in,
    out: view.counters.out,
    reconciled: view.counters.reconciled,
    pending: view.counters.pending,
  },
  days: view.days.map((d) => ({
    date: d.date,
    inCents: String(d.inCents),
    outCents: String(d.outCents),
    dayBalanceCents: String(d.dayBalanceCents),
    lines: d.lines.map((l) => ({
      id: l.id,
      date: l.date.toISOString(),
      movement: l.movement,
      entryType: l.entryType,
      payeeName: l.payeeName,
      memo: l.memo,
      valueCents: String(l.valueCents),
      runningBalanceCents: String(l.runningBalanceCents),
      reconciliationStatus: l.reconciliationStatus,
    })),
  })),
});

/** Serializa o detalhe da conciliação ativa de uma transação (#175). Money em string; data ISO. */
export const transactionReconciliationToDto = (
  r: Reconciliation,
): TransactionReconciliationResponseDto => ({
  id: String(r.id),
  transactionId: String(r.transactionId),
  type: r.type,
  status: r.status,
  reconciledBy: r.audit.reconciledBy,
  reconciledAt: r.audit.reconciledAt.toISOString(),
  differenceCents: r.difference !== null ? String(r.difference.valueCents) : null,
  items: r.items.map((i) => ({
    payableId: String(i.payableId),
    reconciledValueCents: String(i.reconciledValueCents),
  })),
});

/** Serializa os períodos de conciliação de uma conta (#173). Datas do intervalo em YYYY-MM-DD. */
export const reconciliationPeriodsToDto = (
  periods: readonly ReconciliationPeriod[],
): ReconciliationPeriodsResponseDto =>
  periods.map((p) => ({
    id: String(p.id),
    debitAccountRef: p.debitAccountRef,
    periodStart: p.periodStart.toISOString().slice(0, 10),
    periodEnd: p.periodEnd.toISOString().slice(0, 10),
    status: p.status,
    closedAt: p.closedAt !== null ? p.closedAt.toISOString() : null,
    closedBy: p.closedBy,
  }));

/** Serializa os palpites de topo por transação de um extrato (#174). */
export const statementSuggestionsToDto = (
  out: GetStatementSuggestionsOutput,
): StatementSuggestionsResponseDto => ({
  items: out.items.map((i) => ({
    transactionId: i.transactionId,
    topBand: i.topBand,
    topScore: i.topScore,
  })),
});
