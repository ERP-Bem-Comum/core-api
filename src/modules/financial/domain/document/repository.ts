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

// Retorno enriquecido de `findById` (FR-009): expõe o optimistic lock token para que o
// cliente HTTP possa participar do optimistic lock no PATCH/approve/undo.
// Vernon, _Implementing DDD_ (ddd--vernon-livro-vermelho.md:8869): "objects carry a version
// number that is incremented when changes are made and checked before they are saved... If
// the version on the persisted object is greater than the version on the client's copy, the
// client's is considered stale and updates are rejected."
// A `version` é exposta APENAS na serialização/resposta — os use cases de mutação continuam
// usando `cmd.expectedVersion` (a versão que o CLIENTE enviou), NUNCA a versão recém-lida.
export type LoadedDocument = StoredDocument & Readonly<{ version: number }>;

export type DocumentRepositoryError =
  | 'document-not-found'
  | 'document-repository-failure'
  | 'document-version-conflict';

export type DocumentRepository = Readonly<{
  // `timelineEntries` são gravadas NA MESMA transação do agregado (SC-004/NFR-001 — Vernon:3257).
  // Quem não tem trilha (testes de contrato sem timeline, fases anteriores) passa [].
  //
  // `expectedVersion` (opcional — mantém compatibilidade com criadores):
  //   - undefined  → criação / saveDraft / saveDocument / submit: caminho de INSERT; sem checagem
  //     de versão (documento pode não existir ainda).
  //   - number     → mutação de documento existente (adjust/approve/undo): o UPDATE exige
  //     WHERE version = expectedVersion. Se affectedRows = 0, retorna
  //     err('document-version-conflict') (FR-009/ADR-0002 da feature 010).
  save: (
    aggregate: StoredDocument,
    timelineEntries: readonly FinancialTimelineEntry[],
    expectedVersion?: number,
  ) => Promise<Result<void, DocumentRepositoryError>>;
  // Retorna `LoadedDocument` (StoredDocument + version) para que o cliente HTTP possa
  // participar do optimistic lock (FR-009). A `version` é o token de locking — o caller
  // passa-a como `expectedVersion` na próxima mutação.
  findById: (id: DocumentId) => Promise<Result<LoadedDocument, DocumentRepositoryError>>;
  // `expectedVersion` (FR-009): o cancelamento participa do optimistic lock como adjust/approve/undo.
  // DELETE ... WHERE id=? AND version=expectedVersion; affectedRows=0 → 'document-version-conflict'.
  delete: (
    id: DocumentId,
    expectedVersion: number,
  ) => Promise<Result<void, DocumentRepositoryError>>;
  // Read path da listagem paginada (US1) — read-model leve (sem títulos) + total filtrado.
  findPaged: (
    filter: DocumentListFilter,
    page: number,
    pageSize: number,
  ) => Promise<Result<Page<DocumentListItem>, DocumentRepositoryError>>;
}>;
