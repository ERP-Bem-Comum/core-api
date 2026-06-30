/**
 * Mapper agregado `ContractDocument` → DTO de resposta da borda HTTP.
 *
 * `Date` → ISO 8601; branded strings (ids, bucket, storageKey) saem como string crua.
 * `bucket`/`storageKey` são vocabulário público do domínio (handbook §07), não segredo —
 * podem ser expostos. Bytes nunca transitam por aqui.
 */

import type { ContractDocument } from '../../domain/document/types.ts';
import type { DocumentDto } from './schemas.ts';

export const documentToDto = (d: ContractDocument): DocumentDto => ({
  id: d.id,
  parentType: d.parentType,
  parentId: d.parentId,
  categoria: d.categoria,
  fileName: d.fileName,
  mimeType: d.mimeType,
  sizeBytes: d.sizeBytes,
  hashSha256: d.hashSha256,
  bucket: d.bucket,
  storageKey: d.storageKey,
  version: d.version,
  status: d.status,
  uploadedAt: d.uploadedAt.toISOString(),
});
