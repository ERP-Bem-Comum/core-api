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
  LoadedDocument,
  StoredDocument,
  DocumentRepositoryError,
} from '#src/modules/financial/domain/document/repository.ts';
import type { FinancialTimelineEntry } from '#src/modules/financial/domain/timeline/types.ts';
import type { DocumentEvent } from '#src/modules/financial/domain/document/events.ts';
import type { SupplierViewStore } from '#src/modules/financial/application/ports/supplier-view-store.ts';
import type { FinancialOutbox } from '#src/modules/financial/application/ports/outbox.ts';
import { createInMemoryOutbox } from '#src/modules/financial/adapters/outbox/outbox.in-memory.ts';
import type { TimelineStore } from './timeline-repository.in-memory.ts';

// Resolve fornecedor (nome/CNPJ) pelo read-model local — espelha o LEFT JOIN do adapter Drizzle
// (#47/US2). Sem store ou supplierRef ausente no read-model → mantém null (consistência eventual).
const enrichWithSupplierView = async (
  items: readonly DocumentListItem[],
  store: SupplierViewStore | undefined,
): Promise<DocumentListItem[]> => {
  if (store === undefined) return [...items];
  return Promise.all(
    items.map(async (item) => {
      if (item.supplierRef === null) return item;
      const view = await store.get(item.supplierRef);
      if (!view.ok || view.value === null) return item;
      return { ...item, supplierName: view.value.name, supplierDocument: view.value.document };
    }),
  );
};

const matchesFilter = (doc: Document, f: DocumentListFilter): boolean => {
  if (f.status !== undefined && doc.status !== f.status) return false;
  if (f.type !== undefined && doc.type !== f.type) return false;
  if (f.supplierRef !== undefined) {
    if (doc.supplier === null || String(doc.supplier) !== f.supplierRef) return false;
  }
  if (f.dueFrom !== undefined && (doc.dueDate === null || doc.dueDate < f.dueFrom)) return false;
  if (f.dueTo !== undefined && (doc.dueDate === null || doc.dueDate > f.dueTo)) return false;
  if (f.issuedFrom !== undefined && (doc.issueDate === null || doc.issueDate < f.issuedFrom))
    return false;
  if (f.issuedTo !== undefined && (doc.issueDate === null || doc.issueDate > f.issuedTo))
    return false;
  // #167: busca textual — contains case-insensitive. No driver memory o fornecedor só é resolvido
  // (enrichWithSupplierView) na página, após o filtro, então aqui casa apenas por documentNumber;
  // o match por nome/CNPJ é servido pelo adapter Drizzle (validado no x99).
  if (f.q !== undefined) {
    const needle = f.q.toUpperCase();
    if (!(doc.documentNumber ?? '').toUpperCase().includes(needle)) return false;
  }
  return true;
};

// FR-009: version é exposta no read-model para ações inline do front (PATCH/approve sem findById extra).
// Recebe o StoreEntry completo (doc + version) em vez de só o Document.
const toListItem = (entry: StoreEntry): DocumentListItem => ({
  id: entry.aggregate.document.id,
  status: entry.aggregate.document.status,
  documentNumber: entry.aggregate.document.documentNumber ?? null,
  type: entry.aggregate.document.type ?? null,
  supplierRef:
    entry.aggregate.document.supplier === null ? null : String(entry.aggregate.document.supplier),
  // Campos locais do documento expostos no grid (#47/US1).
  series: entry.aggregate.document.series,
  grossValue: entry.aggregate.document.grossValue,
  paymentMethod: entry.aggregate.document.paymentMethod,
  contractRef:
    entry.aggregate.document.contractRef === null
      ? null
      : String(entry.aggregate.document.contractRef),
  netValue: entry.aggregate.document.status === 'Draft' ? null : entry.aggregate.document.netValue,
  dueDate: entry.aggregate.document.dueDate ?? null,
  issueDate: entry.aggregate.document.issueDate ?? null,
  version: entry.version,
  // Default null — enriquecido pelo read-model em findPaged (enrichWithSupplierView).
  supplierName: null,
  supplierDocument: null,
});

// Entrada interna do store: agrega o documento + a versão corrente.
// A versão não é exposta pelo domínio (DocumentRepository não tem getVersion()),
// mas precisa ser rastreada internamente para enforçar o optimistic lock (FR-009).
export type StoreEntry = Readonly<{
  aggregate: StoredDocument;
  version: number;
}>;

// Store compartilhável (#222): o PayableListView in-memory deriva os títulos (pai+filhos) dos mesmos
// `StoredDocument` guardados aqui. Espelha o padrão do `timelineStore` compartilhado.
export type DocumentStore = Map<string, StoreEntry>;

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
  supplierViewStore?: SupplierViewStore,
  // #127: outbox onde os eventos são "publicados" — paridade in-memory da atomicidade do Drizzle.
  // Default: outbox interno (acumula, nunca falha). Testes injetam um que falha p/ provar rollback.
  outbox: FinancialOutbox = createInMemoryOutbox().port,
  // #222: store compartilhável — quando fornecido, o PayableListView in-memory lê os mesmos documentos.
  store: DocumentStore = new Map<string, StoreEntry>(),
): DocumentRepository => {
  return immutable<DocumentRepository>({
    save: async (
      aggregate: StoredDocument,
      timelineEntries: readonly FinancialTimelineEntry[],
      expectedVersion?: number,
      events?: readonly DocumentEvent[],
    ): Promise<Result<void, DocumentRepositoryError>> => {
      const id = aggregate.document.id;
      const existing = store.get(id);

      if (expectedVersion !== undefined) {
        // Caminho de mutação: verificar que a versão armazenada bate com expectedVersion.
        if (existing?.version !== expectedVersion) {
          // Versão divergiu (outra operação já incrementou) → conflito.
          return err('document-version-conflict');
        }
      }

      // #127 — atomicidade: publica os eventos ANTES de persistir; falha no outbox → nada persiste
      // (espelha o rollback da db.transaction do Drizzle).
      if (events !== undefined && events.length > 0) {
        const appended = await outbox.append(events);
        if (!appended.ok) return err('document-repository-failure');
      }

      store.set(id, {
        aggregate,
        version: expectedVersion === undefined ? 0 : expectedVersion + 1,
      });

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
    findById: async (id: DocumentId): Promise<Result<LoadedDocument, DocumentRepositoryError>> => {
      const entry = store.get(id);
      // FR-009: retorna `version` junto com o agregado para que o cliente HTTP
      // possa participar do optimistic lock. Os use cases de mutação continuam usando
      // `cmd.expectedVersion` (versão enviada pelo cliente), nunca a versão recém-lida.
      return Promise.resolve(
        entry !== undefined
          ? ok({ ...entry.aggregate, version: entry.version })
          : err('document-not-found'),
      );
    },
    delete: async (
      id: DocumentId,
      expectedVersion: number,
      events?: readonly DocumentEvent[],
    ): Promise<Result<void, DocumentRepositoryError>> => {
      // Optimistic lock: espelha o DELETE ... WHERE version do adapter Drizzle — affectedRows=0
      // (doc ausente ou versão divergente) → conflito. O use case já tratou not-found via findById.
      // entry?.version é undefined se o doc não existe → undefined !== expectedVersion → conflito,
      // espelhando o affectedRows=0 do Drizzle (doc ausente OU versão divergente).
      const entry = store.get(id);
      if (entry?.version !== expectedVersion) {
        return err('document-version-conflict');
      }
      // #127 — atomicidade: publica antes de remover; falha no outbox → não remove.
      if (events !== undefined && events.length > 0) {
        const appended = await outbox.append(events);
        if (!appended.ok) return err('document-repository-failure');
      }
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
      // Filtra por documento mas mantém o StoreEntry para preservar a version (FR-009).
      const matched = [...store.values()].filter((e) =>
        matchesFilter(e.aggregate.document, filter),
      );

      // Ordena com mesma semântica do Drizzle adapter: dueDate ASC, NULLs primeiro,
      // desempate por id ASC.
      // Justificativa NULLs-primeiro: MySQL 8.4 Refman §11.4.2 —
      //   "NULL values are considered lower than any non-NULL value".
      // Cópia defensiva ([...matched]) evita mutação do array temporário via sort() in-place.
      const sorted = [...matched].sort((a, b) => {
        const dueDateA = a.aggregate.document.dueDate;
        const dueDateB = b.aggregate.document.dueDate;
        // Ambos NULL → igual; NULL < non-NULL (NULL vem primeiro).
        if (dueDateA === null && dueDateB === null) return 0;
        if (dueDateA === null) return -1;
        if (dueDateB === null) return 1;
        const diff = dueDateA.getTime() - dueDateB.getTime();
        if (diff !== 0) return diff;
        // Tie-breaker: id ASC (string compare — UUIDs v4, comprimento fixo 36).
        const idA = a.aggregate.document.id;
        const idB = b.aggregate.document.id;
        return idA < idB ? -1 : idA > idB ? 1 : 0;
      });

      const start = (page - 1) * pageSize;
      const base = sorted.slice(start, start + pageSize).map(toListItem);
      const items = await enrichWithSupplierView(base, supplierViewStore);
      return ok({ items, page, pageSize, total: matched.length });
    },
  });
};
