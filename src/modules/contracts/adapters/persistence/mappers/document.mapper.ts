/**
 * Mapper row <-> domain para ContractDocument.
 *
 * Ticket: CTR-DOCUMENT-AGGREGATE-PERSISTENCE (W1).
 *
 * Forward: domain -> row (`documentToInsert`).
 * Backward: row -> domain (`documentFromRow`) com validacao via smart
 * constructors (rejeita estado invalido vindo do banco).
 *
 * ASCII puro.
 */

import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { ContractDocument, DocumentCategory } from '../../../domain/document/types.ts';
import * as DocumentId from '../../../domain/shared/document-id.ts';
import * as ContractId from '../../../domain/shared/contract-id.ts';
import * as AmendmentId from '../../../domain/shared/amendment-id.ts';
import {
  createBucketName,
  createStorageKey,
} from '../../../application/ports/document-storage.types.ts';
import * as UserRef from '../../../../../shared/kernel/user-ref.ts';
import type { ctrDocuments } from '../schemas/mysql.ts';

export type DocumentRow = typeof ctrDocuments.$inferSelect;
export type DocumentInsert = typeof ctrDocuments.$inferInsert;

export type DocumentMapperError = Readonly<{
  tag: 'DocumentMapperInvalidRow';
  field: string;
  cause: string;
}>;

const fail = (field: string, cause: string): DocumentMapperError => ({
  tag: 'DocumentMapperInvalidRow',
  field,
  cause,
});

const VALID_CATEGORIES: ReadonlySet<DocumentCategory> = new Set<DocumentCategory>([
  'signed_contract',
  'signed_amendment',
  'signed_termination',
  'opinion',
  'certificate',
  'justification',
  'technical_attachment',
  'publication',
  'other',
]);

export const documentFromRow = (
  row: Readonly<DocumentRow>,
): Result<ContractDocument, DocumentMapperError> => {
  const idR = DocumentId.rehydrate(row.id);
  if (!idR.ok) return err(fail('id', idR.error));

  if (row.parentType !== 'Contract' && row.parentType !== 'Amendment') {
    return err(fail('parentType', `unknown: ${row.parentType}`));
  }
  const parentR =
    row.parentType === 'Contract'
      ? ContractId.rehydrate(row.parentId)
      : AmendmentId.rehydrate(row.parentId);
  if (!parentR.ok) return err(fail('parentId', parentR.error));

  if (!VALID_CATEGORIES.has(row.categoria as DocumentCategory)) {
    return err(fail('categoria', `unknown: ${row.categoria}`));
  }

  const bucketR = createBucketName(row.bucket);
  if (!bucketR.ok) return err(fail('bucket', bucketR.error));

  const keyR = createStorageKey(row.storageKey);
  if (!keyR.ok) return err(fail('storageKey', keyR.error));

  const uploadedByR = UserRef.rehydrate(row.uploadedBy);
  if (!uploadedByR.ok) return err(fail('uploadedBy', uploadedByR.error));

  // Core comum a todos os estados. parentType narrowed via guard acima.
  const parentType: 'Contract' | 'Amendment' = row.parentType;
  const core = {
    id: idR.value,
    parentType,
    parentId: parentR.value,
    categoria: row.categoria as DocumentCategory,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    hashSha256: row.hashSha256,
    bucket: bucketR.value,
    storageKey: keyR.value,
    signedElectronically: row.signedElectronically,
    version: row.version,
    uploadedAt: row.uploadedAt,
    uploadedBy: uploadedByR.value,
    retentionUntil: row.retentionUntil,
  };

  switch (row.status) {
    case 'Active':
      return ok({ ...core, status: 'Active' });
    case 'LogicallyDeleted': {
      if (row.deletedAt === null || row.deletedBy === null || row.deletedReason === null) {
        return err(
          fail('deleted-fields', 'LogicallyDeleted exige deletedAt+deletedBy+deletedReason'),
        );
      }
      const deletedByR = UserRef.rehydrate(row.deletedBy);
      if (!deletedByR.ok) return err(fail('deletedBy', deletedByR.error));
      return ok({
        ...core,
        status: 'LogicallyDeleted',
        deletedAt: row.deletedAt,
        deletedBy: deletedByR.value,
        deletedReason: row.deletedReason,
      });
    }
    case 'Superseded': {
      if (
        row.supersededAt === null ||
        row.supersededBy === null ||
        row.supersededByDocumentId === null
      ) {
        return err(
          fail(
            'superseded-fields',
            'Superseded exige supersededAt+supersededBy+supersededByDocumentId',
          ),
        );
      }
      const supersededByR = UserRef.rehydrate(row.supersededBy);
      if (!supersededByR.ok) return err(fail('supersededBy', supersededByR.error));
      const supersededByDocR = DocumentId.rehydrate(row.supersededByDocumentId);
      if (!supersededByDocR.ok) return err(fail('supersededByDocumentId', supersededByDocR.error));
      return ok({
        ...core,
        status: 'Superseded',
        supersededAt: row.supersededAt,
        supersededBy: supersededByR.value,
        supersededByDocumentId: supersededByDocR.value,
      });
    }
    default:
      return err(fail('status', `unknown status: ${row.status}`));
  }
};

export const documentToInsert = (doc: ContractDocument): DocumentInsert => {
  const base = {
    id: String(doc.id),
    parentType: doc.parentType,
    parentId: String(doc.parentId),
    categoria: doc.categoria,
    fileName: doc.fileName,
    mimeType: doc.mimeType,
    sizeBytes: doc.sizeBytes,
    hashSha256: doc.hashSha256,
    bucket: String(doc.bucket),
    storageKey: String(doc.storageKey),
    signedElectronically: doc.signedElectronically,
    version: doc.version,
    uploadedAt: doc.uploadedAt,
    uploadedBy: String(doc.uploadedBy),
    retentionUntil: doc.retentionUntil,
    status: doc.status,
  };
  switch (doc.status) {
    case 'Active':
      return {
        ...base,
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
        supersededAt: null,
        supersededBy: null,
        supersededByDocumentId: null,
      };
    case 'LogicallyDeleted':
      return {
        ...base,
        deletedAt: doc.deletedAt,
        deletedBy: String(doc.deletedBy),
        deletedReason: doc.deletedReason,
        supersededAt: null,
        supersededBy: null,
        supersededByDocumentId: null,
      };
    case 'Superseded':
      return {
        ...base,
        deletedAt: null,
        deletedBy: null,
        deletedReason: null,
        supersededAt: doc.supersededAt,
        supersededBy: String(doc.supersededBy),
        supersededByDocumentId: String(doc.supersededByDocumentId),
      };
  }
};
