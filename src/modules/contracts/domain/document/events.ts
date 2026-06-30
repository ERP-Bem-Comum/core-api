/**
 * Eventos de dominio do agregado ContractDocument.
 *
 * Spec §13.3 lista ContractDocumentAnexado + ContractDocumentExcluido.
 * Este MVP entrega APENAS ContractDocumentAnexado (emitido por create()).
 * ContractDocumentExcluido entra no `CTR-DOCUMENT-LIFECYCLE-DELETE`.
 *
 * Shape de domain event (segue padrao ContractEvent/AmendmentEvent):
 * campos brandeds diretos + occurredAt. NAO confundir com shape "wire" do
 * outbox (que tem schemaVersion + payload serializado) — esse formato e
 * responsabilidade do mapper em adapters/persistence/mappers/outbox.mapper.ts.
 *
 * ASCII puro.
 */

import type { DocumentId } from '../shared/document-id.ts';
import type { ContractId } from '../shared/contract-id.ts';
import type { AmendmentId } from '../shared/amendment-id.ts';
import type { BucketName, StorageKey } from '../../application/ports/document-storage.types.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { DocumentCategory } from './types.ts';

export type ContractDocumentAttachedEvent = Readonly<{
  type: 'ContractDocumentAttached';
  documentId: DocumentId;
  parentType: 'Contract' | 'Amendment';
  parentId: ContractId | AmendmentId;
  categoria: DocumentCategory;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  hashSha256: string;
  bucket: BucketName;
  storageKey: StorageKey;
  signedElectronically: boolean;
  version: number;
  uploadedBy: UserRef;
  retentionUntil: Date | null;
  occurredAt: Date;
}>;

/**
 * Evento emitido por `Document.logicallyDelete`. RN-11 (CTR-DOCUMENT-LIFECYCLE-DELETE).
 */
export type ContractDocumentDeletedEvent = Readonly<{
  type: 'ContractDocumentDeleted';
  documentId: DocumentId;
  parentType: 'Contract' | 'Amendment';
  parentId: ContractId | AmendmentId;
  deletedBy: UserRef;
  deletedReason: string;
  occurredAt: Date;
}>;

/**
 * Evento emitido por `Document.supersede`. RN-AS-02 (CTR-DOCUMENT-LIFECYCLE-SUBSTITUTE).
 */
export type ContractDocumentSupersededEvent = Readonly<{
  type: 'ContractDocumentSuperseded';
  documentId: DocumentId;
  parentType: 'Contract' | 'Amendment';
  parentId: ContractId | AmendmentId;
  supersededBy: UserRef;
  supersededByDocumentId: DocumentId;
  occurredAt: Date;
}>;

export type DocumentEvent =
  | ContractDocumentAttachedEvent
  | ContractDocumentDeletedEvent
  | ContractDocumentSupersededEvent;
