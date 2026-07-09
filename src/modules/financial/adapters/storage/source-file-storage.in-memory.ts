import { createHash } from 'node:crypto';
import { ok, err } from '../../../../shared/primitives/result.ts';
import * as SourceFileRef from '../../domain/document/source-file-ref.ts';
import type { SourceFileStoragePort } from '../../application/ports/source-file-storage.ts';

// Storage in-memory do comprovante-fonte (#62): guarda os bytes num Map e devolve um `SourceFileRef`
// com hash SHA-256 REAL dos bytes. Para testes e boot sem S3. Determinístico (sem timestamp/rand).
export const createInMemorySourceFileStorage = (
  bucket = 'fin-documents-memory',
): SourceFileStoragePort => {
  const store = new Map<string, Uint8Array>();
  return {
    upload: async (input) => {
      const key = `financial/${String(input.documentId)}/${input.fileName}`;
      store.set(key, input.bytes);
      const hashSha256 = createHash('sha256').update(input.bytes).digest('hex');
      const ref = SourceFileRef.create({
        bucket,
        key,
        hashSha256,
        sizeBytes: input.bytes.length,
        mimeType: input.mimeType,
      });
      return ref.ok ? ok(ref.value) : err('source-file-upload-failed');
    },
  };
};
