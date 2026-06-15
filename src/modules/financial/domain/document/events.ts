import type { DocumentId } from '../shared/document-id.ts';
import type { PayableId } from '../shared/payable-id.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';

// Eventos de domínio (EN passado). `occurredAt`/actor são carimbados na borda/use case
// (Functional Core síncrono não conhece relógio).
export type DocumentSaved = Readonly<{
  type: 'DocumentSaved';
  documentId: DocumentId;
  payableIds: readonly PayableId[];
}>;

export type PayableApproved = Readonly<{
  type: 'PayableApproved';
  documentId: DocumentId;
  payableId: PayableId;
  approvedBy: UserRef;
  approvedAt: Date;
}>;

export type ApprovalUndone = Readonly<{
  type: 'ApprovalUndone';
  documentId: DocumentId;
}>;

export type DocumentEvent = DocumentSaved | PayableApproved | ApprovalUndone;
