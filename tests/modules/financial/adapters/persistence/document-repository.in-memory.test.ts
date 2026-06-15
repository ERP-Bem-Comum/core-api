import { describe } from 'node:test';

import { documentRepositoryContract } from './document-repository.suite.ts';
// W0 RED: o adapter in-memory ainda não existe.
import { createInMemoryDocumentRepository } from '#src/modules/financial/adapters/persistence/repos/document-repository.in-memory.ts';

describe('financial/adapters/persistence/document-repository — in-memory', () => {
  documentRepositoryContract(() => createInMemoryDocumentRepository());
});
