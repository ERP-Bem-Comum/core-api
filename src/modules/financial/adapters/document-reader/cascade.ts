import { err } from '../../../../shared/primitives/result.ts';
import type {
  DocumentReaderPort,
  DocumentReaderInput,
} from '../../application/ports/document-reader.ts';
import type { DocumentReaderResult } from '../../domain/document-reader/types.ts';

// Readers injetados na cascata. XML (topo, estruturado) → nativo (texto in-house) → `fallback` (unpdf,
// ADR-0050) → `scanned-unsupported`.
export type CascadeReaders = Readonly<{
  xml: DocumentReaderPort;
  native: DocumentReaderPort;
  fallback: DocumentReaderPort;
}>;

// Erros de RECURSO são terminais (F4/F5): se um degrau já rejeitou o input por `source-too-large`/
// `decompression-limit-exceeded`, NÃO empurramos os mesmos bytes ao próximo, e o erro é propagado —
// não mascarado como `scanned-unsupported` — para preservar o sinal de abuso na borda.
const isResourceError = (e: string): boolean =>
  e === 'source-too-large' || e === 'decompression-limit-exceeded';

// #396: o nativo "bateu a métrica" (ADR-0050) quando classificou E extraiu ao menos um campo-âncora
// (número OU valor). Só `type`, sem campos (layout tabular real) → aciona o fallback `unpdf`.
const hasFields = (r: DocumentReaderResult): boolean =>
  r.documentNumber !== undefined || r.grossValue !== undefined;

export const createCascadeReader = (readers: CascadeReaders): DocumentReaderPort => ({
  // `bytes: Uint8Array` não tem variant readonly nativo no TS 6 (ver port document-reader.ts).
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  read: async (input: DocumentReaderInput) => {
    const viaXml = await readers.xml.read(input);
    if (viaXml.ok) return viaXml;
    if (isResourceError(viaXml.error)) return viaXml;

    const viaNative = await readers.native.read(input);
    if (viaNative.ok && hasFields(viaNative.value)) return viaNative;
    if (!viaNative.ok && isResourceError(viaNative.error)) return viaNative;

    // Nativo não resolveu OU classificou sem campos → fallback `unpdf` (ADR-0050, in-house-first).
    const viaFallback = await readers.fallback.read(input);
    if (viaFallback.ok) return viaFallback;
    if (isResourceError(viaFallback.error)) return viaFallback;
    // Fallback falhou: se o nativo ao menos CLASSIFICOU (type sem campos), devolve-o — melhor que nada.
    if (viaNative.ok) return viaNative;
    return err('scanned-unsupported');
  },
});
