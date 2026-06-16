import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import type { DocumentId } from '#src/modules/financial/domain/shared/document-id.ts';
import type { Document } from '#src/modules/financial/domain/document/types.ts';
import type {
  DocumentListFilter,
  DocumentListItem,
  Page,
} from '#src/modules/financial/domain/document/query.ts';
import type {
  DocumentRepository,
  StoredDocument,
  DocumentRepositoryError,
} from '#src/modules/financial/domain/document/repository.ts';
import type { FinancialTimelineEntry } from '#src/modules/financial/domain/timeline/types.ts';
import type { TimelineStore } from './timeline-repository.in-memory.ts';

const matchesFilter = (doc: Document, f: DocumentListFilter): boolean => {
  if (f.status !== undefined && doc.status !== f.status) return false;
  if (f.type !== undefined && doc.type !== f.type) return false;
  if (f.supplierRef !== undefined) {
    if (doc.supplier === null || String(doc.supplier) !== f.supplierRef) return false;
  }
  if (f.dueFrom !== undefined && (doc.dueDate === null || doc.dueDate < f.dueFrom)) return false;
  if (f.dueTo !== undefined && (doc.dueDate === null || doc.dueDate > f.dueTo)) return false;
  return true;
};

const toListItem = (doc: Document): DocumentListItem => ({
  id: doc.id,
  status: doc.status,
  documentNumber: doc.documentNumber ?? null,
  type: doc.type ?? null,
  supplierRef: doc.supplier === null ? null : String(doc.supplier),
  netValue: doc.status === 'Draft' ? null : doc.netValue,
  dueDate: doc.dueDate ?? null,
});

// Adapter in-memory (testes + composition root de memória). Guarda o agregado por id branded.
//
// `timelineStore`: store compartilhado com o `createInMemoryTimelineRepository`.
//   Quando fornecido, o `save` acumula as entries de trilha no mesmo Map que o
//   timeline-repo lê — garantindo atomicidade em memória sem precisar de tx.
//   Quando omitido (testes de contrato antigos que passam []), o store é descartado.
export const createInMemoryDocumentRepository = (
  timelineStore?: TimelineStore,
): DocumentRepository => {
  const store = new Map<string, StoredDocument>();
  return immutable<DocumentRepository>({
    save: async (
      aggregate: StoredDocument,
      timelineEntries: readonly FinancialTimelineEntry[],
    ): Promise<Result<void, DocumentRepositoryError>> => {
      store.set(aggregate.document.id, aggregate);
      // Acumular entries de trilha no store compartilhado (sc-004/nfr-001).
      if (timelineStore !== undefined && timelineEntries.length > 0) {
        for (const entry of timelineEntries) {
          const key = entry.documentId as unknown as string;
          const existing = timelineStore.get(key);
          if (existing !== undefined) {
            existing.push(entry);
          } else {
            timelineStore.set(key, [entry]);
          }
        }
      }
      return Promise.resolve(ok(undefined));
    },
    findById: async (id: DocumentId): Promise<Result<StoredDocument, DocumentRepositoryError>> => {
      const found = store.get(id);
      return Promise.resolve(found !== undefined ? ok(found) : err('document-not-found'));
    },
    delete: async (id: DocumentId): Promise<Result<void, DocumentRepositoryError>> => {
      store.delete(id);
      // Cascata em memória: remover a trilha junto com o documento (espelha ON DELETE CASCADE do MySQL).
      if (timelineStore !== undefined) {
        timelineStore.delete(id as unknown as string);
      }
      return Promise.resolve(ok(undefined));
    },
    findPaged: async (
      filter: DocumentListFilter,
      page: number,
      pageSize: number,
    ): Promise<Result<Page<DocumentListItem>, DocumentRepositoryError>> => {
      const matched = [...store.values()]
        .map((s) => s.document)
        .filter((d) => matchesFilter(d, filter));
      const start = (page - 1) * pageSize;
      const items = matched.slice(start, start + pageSize).map(toListItem);
      return Promise.resolve(ok({ items, page, pageSize, total: matched.length }));
    },
  });
};
