import type { DocumentId } from '../shared/document-id.ts';
import type { PayableId } from '../shared/payable-id.ts';

// Eventos de domínio (EN passado). `occurredAt`/actor são carimbados na borda/use case
// (Functional Core síncrono não conhece relógio).
export type DocumentSaved = Readonly<{
  type: 'DocumentSaved';
  documentId: DocumentId;
  payableIds: readonly PayableId[];
}>;

export type DocumentEvent = DocumentSaved;
