import { type Result, ok } from '#src/shared/primitives/result.ts';
import type { Document } from '#src/modules/financial/domain/document/types.ts';
import type { Payable } from '#src/modules/financial/domain/payable/types.ts';
import type { StoredDocument } from '#src/modules/financial/domain/document/repository.ts';
import type {
  PayableListFilter,
  PayableListItem,
  Page,
} from '#src/modules/financial/domain/payable/query.ts';
import type {
  PayableListView,
  PayableListViewError,
} from '#src/modules/financial/application/ports/payable-list-view.ts';

// Adapter in-memory do PayableListView (#221): deriva os itens (pai + filhos como linhas) dos
// `StoredDocument` da fonte injetada — espelha o JOIN do Drizzle sobre o agregado em memória.

const toItem = (doc: Document, p: Payable): PayableListItem => ({
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
});

const matchesFilter = (it: PayableListItem, f: PayableListFilter): boolean => {
  if (f.status !== undefined && it.status !== f.status) return false;
  if (f.documentType !== undefined && it.documentType !== f.documentType) return false;
  if (f.supplierRef !== undefined && it.supplierRef !== f.supplierRef) return false;
  if (f.dueFrom !== undefined && it.dueDate < f.dueFrom) return false;
  if (f.dueTo !== undefined && it.dueDate > f.dueTo) return false;
  return true;
};

export const createInMemoryPayableListView = (
  source: () => readonly StoredDocument[],
): PayableListView => ({
  findPaged: async (
    filter: PayableListFilter,
    page: number,
    pageSize: number,
  ): Promise<Result<Page<PayableListItem>, PayableListViewError>> => {
    const items: PayableListItem[] = [];
    for (const stored of source()) {
      if (stored.payables === null) continue;
      for (const p of [stored.payables.parent, ...stored.payables.children]) {
        items.push(toItem(stored.document, p));
      }
    }
    const filtered = items.filter((it) => matchesFilter(it, filter));
    // dueDate ASC, desempate por payableId ASC — mesma semântica do Drizzle.
    const sorted = [...filtered].sort((a, b) => {
      const d = a.dueDate.getTime() - b.dueDate.getTime();
      if (d !== 0) return d;
      return a.payableId < b.payableId ? -1 : a.payableId > b.payableId ? 1 : 0;
    });
    const start = (page - 1) * pageSize;
    return ok({
      items: sorted.slice(start, start + pageSize),
      page,
      pageSize,
      total: filtered.length,
    });
  },
});
