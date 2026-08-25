import { type Result, ok } from '#src/shared/primitives/result.ts';
import type { Document } from '#src/modules/financial/domain/document/types.ts';
import type { Payable } from '#src/modules/financial/domain/payable/types.ts';
import type { LoadedDocument } from '#src/modules/financial/domain/document/repository.ts';
import type {
  PayableListFilter,
  PayableListItem,
  Page,
} from '#src/modules/financial/domain/payable/query.ts';
import type {
  PayableListView,
  PayableListViewError,
  PayableStatusCounts,
} from '#src/modules/financial/application/ports/payable-list-view.ts';
import type { DocumentStatus } from '#src/modules/financial/domain/document/types.ts';

// Adapter in-memory do PayableListView (#221): deriva os itens (pai + filhos como linhas) dos
// `StoredDocument` da fonte injetada — espelha o JOIN do Drizzle sobre o agregado em memória.

const toItem = (doc: Document, p: Payable, version: number): PayableListItem => ({
  payableId: String(p.id),
  documentId: String(p.origin),
  documentNumber: doc.documentNumber ?? null,
  series: doc.series ?? null,
  documentType: doc.type ?? null,
  kind: p.kind,
  retentionType: p.retentionType,
  valueCents: p.value.cents,
  dueDate: p.dueDate,
  status: p.status,
  supplierRef: doc.supplier === null ? null : String(doc.supplier),
  contractRef: doc.contractRef === null ? null : String(doc.contractRef),
  issueDate: doc.issueDate,
  paymentMethod: doc.paymentMethod,
  version,
  grossValueCents: doc.grossValue === null ? null : doc.grossValue.cents,
  // `netValue` só existe em documento submetido (DocumentCore); rascunho não tem líquido calculado.
  netValueCents: 'netValue' in doc ? doc.netValue.cents : null,
  paidAt: p.paidAt,
});

const matchesFilter = (it: PayableListItem, f: PayableListFilter): boolean => {
  if (f.status !== undefined && it.status !== f.status) return false;
  if (f.documentType !== undefined && it.documentType !== f.documentType) return false;
  if (f.supplierRef !== undefined && it.supplierRef !== f.supplierRef) return false;
  if (f.dueFrom !== undefined && it.dueDate < f.dueFrom) return false;
  if (f.dueTo !== undefined && it.dueDate > f.dueTo) return false;
  return true;
};

// Derivação canônica `LoadedDocument[] → PayableListItem[]` (pai + filhos como linhas), extraída
// de `findPaged` para reuso (#357 — `payable-summary-by-ids-view.in-memory.ts` reaproveita esta
// mesma derivação em vez de reimplementar o loop sobre payables.parent/children).
export const derivePayableListItems = (
  documents: readonly LoadedDocument[],
): readonly PayableListItem[] => {
  const items: PayableListItem[] = [];
  for (const stored of documents) {
    if (stored.payables === null) continue;
    for (const p of [stored.payables.parent, ...stored.payables.children]) {
      items.push(toItem(stored.document, p, stored.version));
    }
  }
  return items;
};

export const createInMemoryPayableListView = (
  source: () => readonly LoadedDocument[],
): PayableListView => ({
  findPaged: async (
    filter: PayableListFilter,
    page: number,
    pageSize: number,
  ): Promise<Result<Page<PayableListItem>, PayableListViewError>> => {
    // #263: mais recente (último inserido) primeiro — proxy fiel do `createdAt desc` do Drizzle
    // (o modelo in-memory não guarda createdAt). Pai antes dos filhos dentro do mesmo documento.
    const ordered: PayableListItem[] = [];
    for (const stored of [...source()].reverse()) {
      if (stored.payables === null) continue;
      for (const p of [stored.payables.parent, ...stored.payables.children]) {
        ordered.push(toItem(stored.document, p, stored.version));
      }
    }
    const filtered = ordered.filter((it) => matchesFilter(it, filter));
    const start = (page - 1) * pageSize;
    return ok({
      items: filtered.slice(start, start + pageSize),
      page,
      pageSize,
      total: filtered.length,
    });
  },

  countByStatus: async (
    filter: PayableListFilter,
  ): Promise<Result<PayableStatusCounts, PayableListViewError>> => {
    const items = derivePayableListItems(source());
    const filtered = items.filter((it) => matchesFilter(it, filter));
    const byStatus: Partial<Record<DocumentStatus, number>> = {};
    for (const it of filtered) {
      byStatus[it.status] = (byStatus[it.status] ?? 0) + 1;
    }
    return ok({ total: filtered.length, byStatus });
  },
});
