/**
 * ContractDocument — smart constructor + operacoes do agregado ContractDocument.
 *
 * Modulo-as-namespace (entrevista 0001 §B DO§8):
 *   import * as ContractDocument from '.../document.ts'
 *   Documento.create(input)
 *
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import { immutable } from '../../../../shared/primitives/immutable.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';
import type { DocumentId } from '../shared/document-id.ts';
import type {
  ActiveContractDocument,
  CreateContractDocumentInput,
  LogicallyDeletedContractDocument,
  SupersededContractDocument,
} from './types.ts';
import type {
  ContractDocumentAttachedEvent,
  ContractDocumentDeletedEvent,
  ContractDocumentSupersededEvent,
} from './events.ts';
import type { ContractDocumentError } from './errors.ts';

const FILE_NAME_MAX = 255;
const SHA256_LOWER_HEX = /^[0-9a-f]{64}$/;
const DELETE_REASON_MAX = 500;

export type CreateResult = Readonly<{
  document: ActiveContractDocument;
  event: ContractDocumentAttachedEvent;
}>;

export type DeleteResult = Readonly<{
  document: LogicallyDeletedContractDocument;
  event: ContractDocumentDeletedEvent;
}>;

export type SupersedeResult = Readonly<{
  document: SupersededContractDocument;
  event: ContractDocumentSupersededEvent;
}>;

export const create = (
  input: CreateContractDocumentInput,
): Result<CreateResult, ContractDocumentError> => {
  if (input.fileName.length === 0 || input.fileName.length > FILE_NAME_MAX) {
    return err('document-invalid-file-name');
  }
  if (input.mimeType.length === 0) {
    return err('document-empty-mime-type');
  }
  if (input.sizeBytes < 0) {
    return err('document-negative-size');
  }
  if (!SHA256_LOWER_HEX.test(input.hashSha256)) {
    return err('document-invalid-hash-sha256');
  }
  if (!Number.isInteger(input.version) || input.version < 1) {
    return err('document-invalid-version');
  }
  if (
    input.retentionUntil !== null &&
    input.retentionUntil.getTime() < input.uploadedAt.getTime()
  ) {
    return err('document-retention-before-upload');
  }

  const document: ActiveContractDocument = immutable({
    id: input.id,
    parentType: input.parentType,
    parentId: input.parentId,
    categoria: input.categoria,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    hashSha256: input.hashSha256,
    bucket: input.bucket,
    storageKey: input.storageKey,
    signedElectronically: input.signedElectronically,
    version: input.version,
    uploadedAt: input.uploadedAt,
    uploadedBy: input.uploadedBy,
    retentionUntil: input.retentionUntil,
    status: 'Active',
  });

  const event: ContractDocumentAttachedEvent = immutable({
    type: 'ContractDocumentAttached',
    documentId: input.id,
    parentType: input.parentType,
    parentId: input.parentId,
    categoria: input.categoria,
    fileName: input.fileName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    hashSha256: input.hashSha256,
    bucket: input.bucket,
    storageKey: input.storageKey,
    signedElectronically: input.signedElectronically,
    version: input.version,
    uploadedBy: input.uploadedBy,
    retentionUntil: input.retentionUntil,
    occurredAt: input.uploadedAt,
  });

  return ok(immutable({ document, event }));
};

/**
 * Exclusao logica do documento (RN-11). Aceita SOMENTE ActiveContractDocument —
 * compilador rejeita tentativa de re-deletar via type narrowing.
 *
 * Ticket: CTR-DOCUMENT-LIFECYCLE-DELETE.
 */
export const logicallyDelete = (
  active: ActiveContractDocument,
  reason: string,
  by: UserRef,
  at: Date,
): Result<DeleteResult, ContractDocumentError> => {
  if (reason.length === 0) {
    return err('document-empty-delete-reason');
  }
  if (reason.length > DELETE_REASON_MAX) {
    return err('document-delete-reason-too-long');
  }
  if (at.getTime() < active.uploadedAt.getTime()) {
    return err('document-delete-before-upload');
  }

  const document: LogicallyDeletedContractDocument = immutable({
    id: active.id,
    parentType: active.parentType,
    parentId: active.parentId,
    categoria: active.categoria,
    fileName: active.fileName,
    mimeType: active.mimeType,
    sizeBytes: active.sizeBytes,
    hashSha256: active.hashSha256,
    bucket: active.bucket,
    storageKey: active.storageKey,
    signedElectronically: active.signedElectronically,
    version: active.version,
    uploadedAt: active.uploadedAt,
    uploadedBy: active.uploadedBy,
    retentionUntil: active.retentionUntil,
    status: 'LogicallyDeleted',
    deletedAt: at,
    deletedBy: by,
    deletedReason: reason,
  });

  const event: ContractDocumentDeletedEvent = immutable({
    type: 'ContractDocumentDeleted',
    documentId: active.id,
    parentType: active.parentType,
    parentId: active.parentId,
    deletedBy: by,
    deletedReason: reason,
    occurredAt: at,
  });

  return ok(immutable({ document, event }));
};

/**
 * Substituicao do documento por nova versao (RN-AS-02). Aceita SOMENTE
 * ActiveContractDocument — compilador rejeita tentativa de re-substituir.
 *
 * Ticket: CTR-DOCUMENT-LIFECYCLE-SUBSTITUTE.
 */
export const supersede = (
  active: ActiveContractDocument,
  supersededByDocumentId: DocumentId,
  by: UserRef,
  at: Date,
): Result<SupersedeResult, ContractDocumentError> => {
  if (supersededByDocumentId === active.id) {
    return err('document-supersede-self');
  }
  if (at.getTime() < active.uploadedAt.getTime()) {
    return err('document-supersede-before-upload');
  }

  const document: SupersededContractDocument = immutable({
    id: active.id,
    parentType: active.parentType,
    parentId: active.parentId,
    categoria: active.categoria,
    fileName: active.fileName,
    mimeType: active.mimeType,
    sizeBytes: active.sizeBytes,
    hashSha256: active.hashSha256,
    bucket: active.bucket,
    storageKey: active.storageKey,
    signedElectronically: active.signedElectronically,
    version: active.version,
    uploadedAt: active.uploadedAt,
    uploadedBy: active.uploadedBy,
    retentionUntil: active.retentionUntil,
    status: 'Superseded',
    supersededAt: at,
    supersededBy: by,
    supersededByDocumentId,
  });

  const event: ContractDocumentSupersededEvent = immutable({
    type: 'ContractDocumentSuperseded',
    documentId: active.id,
    parentType: active.parentType,
    parentId: active.parentId,
    supersededBy: by,
    supersededByDocumentId,
    occurredAt: at,
  });

  return ok(immutable({ document, event }));
};
