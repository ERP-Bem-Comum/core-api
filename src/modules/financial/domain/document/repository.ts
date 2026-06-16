import type { Result } from '../../../../shared/primitives/result.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type { Document } from './types.ts';
import type { DocumentListFilter, DocumentListItem, Page } from './query.ts';
import type { Payables } from '../payable/types.ts';
import type { FinancialTimelineEntry } from '../timeline/types.ts';

// Port ditado pelo ciclo de vida do agregado Document (ts-domain-modeler §3.H.2 — critério H2 → domain/).
// O agregado persistido = documento (qualquer estado) + seus títulos (`payables` é null no rascunho).

export type StoredDocument = Readonly<{
  document: Document;
  payables: Payables | null;
}>;

export type DocumentRepositoryError = 'document-not-found' | 'document-repository-failure';

export type DocumentRepository = Readonly<{
  // `timelineEntries` são gravadas NA MESMA transação do agregado (SC-004/NFR-001 — Vernon:3257).
  // Quem não tem trilha (testes de contrato sem timeline, fases anteriores) passa [].
  save: (
    aggregate: StoredDocument,
    timelineEntries: readonly FinancialTimelineEntry[],
  ) => Promise<Result<void, DocumentRepositoryError>>;
  findById: (id: DocumentId) => Promise<Result<StoredDocument, DocumentRepositoryError>>;
  delete: (id: DocumentId) => Promise<Result<void, DocumentRepositoryError>>;
  // Read path da listagem paginada (US1) — read-model leve (sem títulos) + total filtrado.
  findPaged: (
    filter: DocumentListFilter,
    page: number,
    pageSize: number,
  ) => Promise<Result<Page<DocumentListItem>, DocumentRepositoryError>>;
}>;
