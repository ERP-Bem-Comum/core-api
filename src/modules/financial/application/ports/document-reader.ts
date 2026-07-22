import type { Result } from '../../../../shared/primitives/result.ts';
import type { DocumentReaderResult } from '../../domain/document-reader/types.ts';
import type { DocumentReaderError } from '../../domain/document-reader/errors.ts';

// Port do motor de leitura (fatia 1 — FIN-DOC-READER-PORT). Recebe BYTES, nunca URL
// (ADR-0050, anti-SSRF). `type Readonly<{}>` de função + `Result` — sem class/interface (CA1).
export type DocumentReaderInput = Readonly<{
  bytes: Uint8Array;
  declaredMime?: string;
}>;

export type DocumentReaderPort = Readonly<{
  // `Uint8Array` (em `bytes`) não tem variant `readonly` nativo no TS 6, e `Readonly<Uint8Array>`
  // não impede `.set(...)`. Segue o precedente de `contracts/.../document-storage.ts`: o contrato é
  // "reader consome `bytes` sem mutar"; o ESLint não expressa isso para tipos não-readonly nativos.
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  read: (input: DocumentReaderInput) => Promise<Result<DocumentReaderResult, DocumentReaderError>>;
}>;
