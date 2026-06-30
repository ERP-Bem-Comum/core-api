import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { newUuid, isUuidV4 } from '../../../../shared/utils/id.ts';
import type { Brand } from '../../../../shared/primitives/brand.ts';

// Padrão D (entrevista 0001 §B DO§8): module-as-namespace.
// Consumir com `import * as DocumentId from './document-id.ts'`.

export type DocumentId = Brand<string, 'DocumentId'>;
export type DocumentIdError = 'document-id-invalid';

export const generate = (): DocumentId => newUuid() as DocumentId;

export const rehydrate = (raw: string): Result<DocumentId, DocumentIdError> =>
  isUuidV4(raw) ? ok(raw as DocumentId) : err('document-id-invalid');
