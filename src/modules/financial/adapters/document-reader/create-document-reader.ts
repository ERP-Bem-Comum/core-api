import type { DocumentReaderPort } from '../../application/ports/document-reader.ts';
import { createCascadeReader } from './cascade.ts';
import { createXmlDocumentReader } from './xml.ts';
import { createNativePdfDocumentReader } from './native-pdf.ts';
import { createUnpdfDocumentReader } from './unpdf-reader.ts';

// Composição do motor de leitura de documento fiscal (ADR-0050). Monta a cascata nativo-first: XML
// (topo, estruturado) → PDF nativo (texto in-house) → `unpdf` (fallback gated, #396 — layouts tabulares
// reais) → `scanned-unsupported`. Ponto ÚNICO de montagem; a borda HTTP o consome sem conhecer os adapters.
export const createDocumentReader = (): DocumentReaderPort =>
  createCascadeReader({
    xml: createXmlDocumentReader(),
    native: createNativePdfDocumentReader(),
    fallback: createUnpdfDocumentReader(),
  });
