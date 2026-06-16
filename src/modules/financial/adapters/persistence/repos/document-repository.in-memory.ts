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

// Entrada interna do store: agrega o documento + a versão corrente.
// A versão não é exposta pelo domínio (DocumentRepository não tem getVersion()),
// mas precisa ser rastreada internamente para enforçar o optimistic lock (FR-009).
type StoreEntry = Readonly<{
  aggregate: StoredDocument;
  version: number;
}>;

// Adapter in-memory (testes + composition root de memória). Guarda o agregado por id branded.
//
// `timelineStore`: store compartilhado com o `createInMemoryTimelineRepository`.
//   Quando fornecido, o `save` acumula as entries de trilha no mesmo Map que o
//   timeline-repo lê — garantindo atomicidade em memória sem precisar de tx.
//   Quando omitido (testes de contrato antigos que passam []), o store é descartado.
//
// Versão (optimistic lock — FR-009):
//   O store interno guarda `{ aggregate, version }`. O `save` com `expectedVersion`
//   definido compara a versão armazenada com `expectedVersion`; se divergir retorna
//   err('document-version-conflict'). A criação (expectedVersion === undefined)
//   insere com version=0. Cada mutação bem-sucedida incrementa a versão para
//   `expectedVersion + 1`, espelhando o comportamento do Drizzle repo com MySQL.
export const createInMemoryDocumentRepository = (
  timelineStore?: TimelineStore,
): DocumentRepository => {
  const store = new Map<string, StoreEntry>();
  return immutable<DocumentRepository>({
    save: async (
      aggregate: StoredDocument,
      timelineEntries: readonly FinancialTimelineEntry[],
      expectedVersion?: number,
    ): Promise<Result<void, DocumentRepositoryError>> => {
      const id = aggregate.document.id;
      const existing = store.get(id);

      if (expectedVersion === undefined) {
        // Caminho de criação: sem checagem de versão, insere com version=0.
        store.set(id, { aggregate, version: 0 });
      } else {
        // Caminho de mutação: verificar que a versão armazenada bate com expectedVersion.
        const storedVersion = existing?.version;
        if (storedVersion !== expectedVersion) {
          // Versão divergiu (outra operação já incrementou) → conflito.
          return Promise.resolve(err('document-version-conflict'));
        }
        store.set(id, { aggregate, version: expectedVersion + 1 });
      }

      // Acumular entries de trilha no store compartilhado (SC-004/NFR-001).
      if (timelineStore !== undefined && timelineEntries.length > 0) {
        for (const entry of timelineEntries) {
          const key = entry.documentId as unknown as string;
          const existingEntries = timelineStore.get(key);
          if (existingEntries !== undefined) {
            existingEntries.push(entry);
          } else {
            timelineStore.set(key, [entry]);
          }
        }
      }
      return Promise.resolve(ok(undefined));
    },
    findById: async (id: DocumentId): Promise<Result<StoredDocument, DocumentRepositoryError>> => {
      const entry = store.get(id);
      return Promise.resolve(entry !== undefined ? ok(entry.aggregate) : err('document-not-found'));
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
        .map((e) => e.aggregate.document)
        .filter((d) => matchesFilter(d, filter));
      const start = (page - 1) * pageSize;
      const items = matched.slice(start, start + pageSize).map(toListItem);
      return Promise.resolve(ok({ items, page, pageSize, total: matched.length }));
    },
  });
};
