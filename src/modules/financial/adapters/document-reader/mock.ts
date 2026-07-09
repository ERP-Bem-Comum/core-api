import { ok, err } from '../../../../shared/primitives/result.ts';
import type { DocumentReaderPort } from '../../application/ports/document-reader.ts';
import type { DocumentReaderResult } from '../../domain/document-reader/types.ts';
import type { DocumentReaderError } from '../../domain/document-reader/errors.ts';

// Semente determinística: um resultado OU um erro (fatia 1 — CA3). Consumível por testes de
// application das fatias seguintes, sem tocar infra real.
export type MockReaderSeed =
  | Readonly<{ result: DocumentReaderResult }>
  | Readonly<{ error: DocumentReaderError }>;

// Mock adapter: ignora o input e devolve sempre o Result semeado (determinístico).
export const createMockDocumentReader = (seed: MockReaderSeed): DocumentReaderPort => ({
  read: async () => ('result' in seed ? ok(seed.result) : err(seed.error)),
});
