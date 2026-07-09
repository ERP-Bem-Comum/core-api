import type { DocumentReaderPort } from '../../application/ports/document-reader.ts';
import { createCascadeReader } from './cascade.ts';
import { createXmlDocumentReader } from './xml.ts';
import { createNativePdfDocumentReader } from './native-pdf.ts';

// Composição do motor de leitura de documento fiscal (fatia 4 — o fecho, ADR-0050). Monta a cascata
// nativo-first com os readers reais: XML (topo, estruturado) → PDF nativo (texto in-house) →
// `scanned-unsupported`. Ponto ÚNICO de montagem; a fatia 2 (borda HTTP + wiring ao `Document`) o
// consome sem conhecer os adapters concretos.
export const createDocumentReader = (): DocumentReaderPort =>
  createCascadeReader({
    xml: createXmlDocumentReader(),
    native: createNativePdfDocumentReader(),
  });
