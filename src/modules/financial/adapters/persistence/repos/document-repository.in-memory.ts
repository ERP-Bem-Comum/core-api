import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import { immutable } from '#src/shared/primitives/immutable.ts';
import type { DocumentId } from '#src/modules/financial/domain/shared/document-id.ts';
import type {
  DocumentRepository,
  StoredDocument,
  DocumentRepositoryError,
} from '#src/modules/financial/domain/document/repository.ts';

// Adapter in-memory (testes + composition root de memória). Guarda o agregado por id branded.
export const createInMemoryDocumentRepository = (): DocumentRepository => {
  const store = new Map<string, StoredDocument>();
  return immutable<DocumentRepository>({
    save: (aggregate: StoredDocument): Promise<Result<void, DocumentRepositoryError>> => {
      store.set(aggregate.document.id, aggregate);
      return Promise.resolve(ok(undefined));
    },
    findById: (id: DocumentId): Promise<Result<StoredDocument, DocumentRepositoryError>> => {
      const found = store.get(id);
      return Promise.resolve(found ? ok(found) : err('document-not-found'));
    },
    delete: (id: DocumentId): Promise<Result<void, DocumentRepositoryError>> => {
      store.delete(id);
      return Promise.resolve(ok(undefined));
    },
  });
};
