import type { Result } from '../../../../shared/primitives/result.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type { Document } from './types.ts';
import type { Payables } from '../payable/types.ts';

// Port ditado pelo ciclo de vida do agregado Document (ts-domain-modeler §3.H.2 — critério H2 → domain/).
// O agregado persistido = documento (qualquer estado) + seus títulos (`payables` é null no rascunho).

export type StoredDocument = Readonly<{
  document: Document;
  payables: Payables | null;
}>;

export type DocumentRepositoryError = 'document-not-found' | 'document-repository-failure';

export type DocumentRepository = Readonly<{
  save: (aggregate: StoredDocument) => Promise<Result<void, DocumentRepositoryError>>;
  findById: (id: DocumentId) => Promise<Result<StoredDocument, DocumentRepositoryError>>;
  delete: (id: DocumentId) => Promise<Result<void, DocumentRepositoryError>>;
}>;
