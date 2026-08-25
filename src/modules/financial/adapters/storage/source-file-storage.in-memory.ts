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
      const hashSha256 = createHash('sha256').update(input.bytes).digest('hex');
      // F2: valida a key ANTES de gravar (mesma ordem do adapter S3 — não replicar padrão inseguro).
      const ref = SourceFileRef.create({
        bucket,
        key,
        hashSha256,
        sizeBytes: input.bytes.length,
        mimeType: input.mimeType,
      });
      if (!ref.ok) return err('source-file-upload-failed');
      store.set(key, input.bytes);
      return ok(ref.value);
    },
    remove: async (ref) => {
      store.delete(ref.key);
      return ok(undefined);
    },
    download: async (ref) => {
      const bytes = store.get(ref.key);
      if (bytes === undefined) return err('source-file-download-failed');
      return ok({ bytes, mimeType: ref.mimeType });
    },
  };
};
