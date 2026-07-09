import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';

// VO da referência ao arquivo-fonte (PDF/XML) guardado no storage — o `Document` é dono do seu
// comprovante (fatia 2, #62). **VO PRÓPRIO do financial**: NÃO importa `StorageRef` de contracts
// (ADR-0006, domínio não conhece outro módulo). A conversão `StorageRef` (contracts) → `SourceFileRef`
// acontece na application (use case de ingestão), onde `contracts/public-api` é permitido.
export type SourceFileRef = Readonly<{
  bucket: string;
  key: string;
  hashSha256: string;
  sizeBytes: number;
  mimeType: string;
}>;

export type SourceFileRefInput = Readonly<{
  bucket: string;
  key: string;
  hashSha256: string;
  sizeBytes: number;
  mimeType: string;
}>;

export type SourceFileRefError =
  | 'source-file-bucket-invalid'
  | 'source-file-key-invalid'
  | 'source-file-hash-invalid'
  | 'source-file-size-invalid'
  | 'source-file-mime-invalid';

const SHA256 = /^[0-9a-f]{64}$/i;
// Segmento `.`/`..` na chave → path-traversal.
const KEY_TRAVERSAL = /(^|\/)\.\.?(\/|$)/;
// Control chars (< 0x20) na chave → inválido (evita CR/LF/NUL em storage key).
const hasControlChars = (s: string): boolean => {
  for (const ch of s) {
    const code = ch.codePointAt(0);
    if (code !== undefined && code < 0x20) return true;
  }
  return false;
};

// Limites de tamanho = larguras das colunas persistidas (schemas/mysql.ts) — bucket/key são
// limites do próprio S3 (ADR-0019). O cap nasce no domínio (ADR-0020: CHECK é defesa em
// profundidade, não a única validação); sem ele, um valor longo só falharia com ERROR 1406 no INSERT.
const MAX_BUCKET = 63;
const MAX_KEY = 1024;
const MAX_MIME = 127;

export const create = (input: SourceFileRefInput): Result<SourceFileRef, SourceFileRefError> => {
  if (input.bucket.trim() === '' || input.bucket.length > MAX_BUCKET)
    return err('source-file-bucket-invalid');
  if (
    input.key.trim() === '' ||
    input.key.length > MAX_KEY ||
    KEY_TRAVERSAL.test(input.key) ||
    hasControlChars(input.key)
  )
    return err('source-file-key-invalid');
  if (!SHA256.test(input.hashSha256)) return err('source-file-hash-invalid');
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0)
    return err('source-file-size-invalid');
  if (input.mimeType.trim() === '' || input.mimeType.length > MAX_MIME)
    return err('source-file-mime-invalid');
  return ok(
    immutable({
      bucket: input.bucket,
      key: input.key,
      hashSha256: input.hashSha256.toLowerCase(),
      sizeBytes: input.sizeBytes,
      mimeType: input.mimeType,
    }),
  );
};
