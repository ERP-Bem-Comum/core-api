// Erros do motor de leitura de documento (fatia 1 — FIN-DOC-READER-PORT).
// Union kebab EN (`.claude/rules/domain.md`). `DOCUMENT_READER_ERRORS` é o witness de RUNTIME
// da tupla — o `type` deriva dela, garantindo union e valor em sincronia (fonte única de verdade).
export const DOCUMENT_READER_ERRORS = [
  'scanned-unsupported',
  'unsupported-pdf-structure',
  'decompression-limit-exceeded',
  'source-too-large',
  'empty-input',
  'malformed-document',
] as const;

export type DocumentReaderError = (typeof DOCUMENT_READER_ERRORS)[number];
