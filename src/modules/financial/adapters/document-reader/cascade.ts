import { err } from '../../../../shared/primitives/result.ts';
import type {
  DocumentReaderPort,
  DocumentReaderInput,
} from '../../application/ports/document-reader.ts';

// Readers injetados na cascata (fatia 1 — CA4). Na fatia 1 podem ser stubs/mocks;
// os readers reais (XML/nativo) entram em FIN-DOC-READER-XML / FIN-DOC-READER-NATIVE.
export type CascadeReaders = Readonly<{
  xml: DocumentReaderPort;
  native: DocumentReaderPort;
}>;

// Precedência XML > nativo > `scanned-unsupported`, com SHORT-CIRCUIT: se o XML resolve,
// o nativo nem é consultado (ADR-0050, degrau da cascata).
//
// Erros de RECURSO são terminais (F4/F5): se o XML já rejeitou o input por `source-too-large`,
// NÃO empurramos os mesmos bytes gigantes ao nativo; e um erro de recurso do nativo
// (`decompression-limit-exceeded`/`source-too-large`) é propagado — não mascarado como
// `scanned-unsupported` — para preservar o sinal de abuso na borda (telemetria/rate-limit).
const isResourceError = (e: string): boolean =>
  e === 'source-too-large' || e === 'decompression-limit-exceeded';

export const createCascadeReader = (readers: CascadeReaders): DocumentReaderPort => ({
  // `bytes: Uint8Array` não tem variant readonly nativo no TS 6 (ver port document-reader.ts).
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  read: async (input: DocumentReaderInput) => {
    const viaXml = await readers.xml.read(input);
    if (viaXml.ok) return viaXml;
    if (isResourceError(viaXml.error)) return viaXml;

    const viaNative = await readers.native.read(input);
    if (viaNative.ok) return viaNative;
    if (isResourceError(viaNative.error)) return viaNative;

    return err('scanned-unsupported');
  },
});
