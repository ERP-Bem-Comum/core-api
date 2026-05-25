/**
 * uploadDocument — use case canonico que orquestra:
 *   1. Validar input primitivo via smart constructors (parentId, uploadedBy, bucket)
 *   2. Validar parent existe (contractRepo OR amendmentRepo conforme parentType)
 *   3. Gerar documentId + storageKey (`${prefix}/${docId}/${fileName}`)
 *   4. Calcular hash SHA-256 dos bytes
 *   5. storage.upload com expectedSha256 (defesa em profundidade)
 *   6. Document.create (uploadedAt = clock.now())
 *   7. documentRepo.save(doc, [event]) — outbox integration via repo
 *
 * Ticket: CTR-USECASE-UPLOAD-DOCUMENT.
 *
 * Padrao CTR-OUTBOX-INTEGRATION-IN-REPOS: sem EventBus direto; evento entra
 * no outbox via repo.save (atomicidade ACID no Drizzle).
 *
 * ASCII puro.
 */

import { createHash } from 'node:crypto';

import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import type { Clock } from '../../../../shared/ports/clock.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import type { DocumentIdError } from '../../domain/shared/document-id.ts';
import * as ContractId from '../../domain/shared/contract-id.ts';
import type { ContractIdError } from '../../domain/shared/contract-id.ts';
import * as AmendmentId from '../../domain/shared/amendment-id.ts';
import type { AmendmentIdError } from '../../domain/shared/amendment-id.ts';
import * as UserRef from '../../../../shared/kernel/user-ref.ts';
import type { UserRefError } from '../../../../shared/kernel/user-ref.ts';
import {
  createBucketName,
  createStorageKey,
  type BucketNameError,
  type StorageKeyError,
} from '../ports/document-storage.types.ts';
import type { DocumentStorage, DocumentStorageError } from '../ports/document-storage.ts';
import * as Document from '../../domain/document/document.ts';
import type {
  ContractDocument,
  CreateContractDocumentInput,
  DocumentCategory,
} from '../../domain/document/types.ts';
import type { DocumentEvent } from '../../domain/document/events.ts';
import type { ContractDocumentError } from '../../domain/document/errors.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';
import type {
  ContractRepository,
  ContractRepositoryError,
} from '../../domain/contract/repository.ts';
import type {
  AmendmentRepository,
  AmendmentRepositoryError,
} from '../../domain/amendment/repository.ts';

// ─── command + output ────────────────────────────────────────────────────────

export type UploadDocumentCommand = Readonly<{
  parentType: 'Contract' | 'Amendment';
  parentId: string;
  categoria: DocumentCategory;
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
  signedElectronically: boolean;
  uploadedBy: string;
  retentionUntil: Date | null;
  bucket: string;
  storageKeyPrefix: string;
}>;

export type UploadDocumentOutput = Readonly<{
  document: ContractDocument;
  event: DocumentEvent;
}>;

export type UploadDocumentError =
  | DocumentIdError
  | ContractIdError
  | AmendmentIdError
  | UserRefError
  | BucketNameError
  | StorageKeyError
  | 'parent-not-found'
  | ContractRepositoryError
  | AmendmentRepositoryError
  | DocumentStorageError
  | ContractDocumentError
  | DocumentRepositoryError;

// ─── deps ────────────────────────────────────────────────────────────────────

export type UploadDocumentDeps = Readonly<{
  clock: Clock;
  storage: DocumentStorage;
  documentRepo: DocumentRepository;
  contractRepo: ContractRepository;
  amendmentRepo: AmendmentRepository;
  idGenerator?: () => ReturnType<typeof DocumentId.generate>;
}>;

// ─── helper ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const sha256hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

// ─── use case ────────────────────────────────────────────────────────────────

export const uploadDocument =
  (deps: UploadDocumentDeps) =>
  async (
    // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
    cmd: UploadDocumentCommand,
  ): Promise<Result<UploadDocumentOutput, UploadDocumentError>> => {
    // 1. Validar parentId conforme parentType
    const parentIdR =
      cmd.parentType === 'Contract'
        ? ContractId.rehydrate(cmd.parentId)
        : AmendmentId.rehydrate(cmd.parentId);
    if (!parentIdR.ok) return err(parentIdR.error);

    // 2. Validar uploadedBy
    const uploadedByR = UserRef.rehydrate(cmd.uploadedBy);
    if (!uploadedByR.ok) return err(uploadedByR.error);

    // 3. Validar bucket
    const bucketR = createBucketName(cmd.bucket);
    if (!bucketR.ok) return err(bucketR.error);

    // 4. Validar parent existe via repo
    if (cmd.parentType === 'Contract') {
      const parentR = await deps.contractRepo.findById(
        parentIdR.value as ReturnType<typeof ContractId.rehydrate> extends { value: infer V }
          ? V
          : never,
      );
      if (!parentR.ok) return err(parentR.error);
      if (parentR.value === null) return err('parent-not-found');
    } else {
      const parentR = await deps.amendmentRepo.findById(
        parentIdR.value as ReturnType<typeof AmendmentId.rehydrate> extends { value: infer V }
          ? V
          : never,
      );
      if (!parentR.ok) return err(parentR.error);
      if (parentR.value === null) return err('parent-not-found');
    }

    // 5. Gerar ID + storageKey
    const generator = deps.idGenerator ?? DocumentId.generate;
    const documentId = generator();
    const storageKeyRaw = `${cmd.storageKeyPrefix}/${String(documentId)}/${cmd.fileName}`;
    const storageKeyR = createStorageKey(storageKeyRaw);
    if (!storageKeyR.ok) return err(storageKeyR.error);

    // 6. Calcular hash + snapshot defensivo dos bytes
    const bytesCopy = cmd.bytes.slice();
    const hash = sha256hex(bytesCopy);

    // 7. Upload no storage (com expectedSha256 - defesa em profundidade)
    const uploadR = await deps.storage.upload({
      bucket: bucketR.value,
      key: storageKeyR.value,
      bytes: bytesCopy,
      mimeType: cmd.mimeType,
      expectedSha256: hash,
    });
    if (!uploadR.ok) return err(uploadR.error);

    // 8. Criar agregado
    const createInput: CreateContractDocumentInput = {
      id: documentId,
      parentType: cmd.parentType,
      parentId: parentIdR.value,
      categoria: cmd.categoria,
      fileName: cmd.fileName,
      mimeType: cmd.mimeType,
      sizeBytes: bytesCopy.length,
      hashSha256: hash,
      bucket: bucketR.value,
      storageKey: storageKeyR.value,
      signedElectronically: cmd.signedElectronically,
      version: 1,
      uploadedAt: deps.clock.now(),
      uploadedBy: uploadedByR.value,
      retentionUntil: cmd.retentionUntil,
    };
    const createR = Document.create(createInput);
    if (!createR.ok) return err(createR.error);

    // 9. Save no repo com evento (outbox integration)
    const saveR = await deps.documentRepo.save(createR.value.document, [createR.value.event]);
    if (!saveR.ok) return err(saveR.error);

    return ok({ document: createR.value.document, event: createR.value.event });
  };
