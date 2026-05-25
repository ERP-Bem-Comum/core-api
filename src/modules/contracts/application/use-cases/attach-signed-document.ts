import { type Result, ok, err } from '../../../../shared/primitives/result.ts';
import * as AmendmentId from '../../domain/shared/amendment-id.ts';
import type { AmendmentIdError } from '../../domain/shared/amendment-id.ts';
import * as DocumentId from '../../domain/shared/document-id.ts';
import type { DocumentIdError } from '../../domain/shared/document-id.ts';
import { Amendment } from '../../domain/amendment/amendment.ts';
import type { Amendment as AmendmentEntity } from '../../domain/amendment/types.ts';
import type { AmendmentEvent } from '../../domain/amendment/events.ts';
import type { AmendmentError } from '../../domain/amendment/errors.ts';
import type {
  AmendmentRepository,
  AmendmentRepositoryError,
} from '../../domain/amendment/repository.ts';
import type {
  DocumentRepository,
  DocumentRepositoryError,
} from '../../domain/document/repository.ts';

// CA-5+CA-6 (CTR-OUTBOX-INTEGRATION-IN-REPOS):
//   - eventBus removido de Deps.
//   - Evento passado como 2o argumento de amendmentRepo.save.
//
// CTR-AMENDMENT-DOCUMENT-LINK: + documentRepo.findById valida que o
// documento referenciado existe no agregado ContractDocument antes do attach.

export type AttachSignedDocumentCommand = Readonly<{
  amendmentId: string;
  signedDocumentRef: string;
}>;

export type AttachSignedDocumentError =
  | AmendmentIdError
  | DocumentIdError
  | 'amendment-not-found'
  | 'signed-document-not-found'
  | AmendmentError
  | AmendmentRepositoryError
  | DocumentRepositoryError;

export type AttachSignedDocumentOutput = Readonly<{
  amendment: AmendmentEntity;
  event: AmendmentEvent;
}>;

type Deps = Readonly<{
  amendmentRepo: AmendmentRepository;
  documentRepo: DocumentRepository;
}>;

export const attachSignedDocument =
  (deps: Deps) =>
  async (
    cmd: AttachSignedDocumentCommand,
  ): Promise<Result<AttachSignedDocumentOutput, AttachSignedDocumentError>> => {
    const amendmentIdResult = AmendmentId.rehydrate(cmd.amendmentId);
    if (!amendmentIdResult.ok) return amendmentIdResult;

    const docIdResult = DocumentId.rehydrate(cmd.signedDocumentRef);
    if (!docIdResult.ok) return docIdResult;

    const load = await deps.amendmentRepo.findById(amendmentIdResult.value);
    if (!load.ok) return load;
    if (load.value === null) return err('amendment-not-found');

    // CTR-AMENDMENT-DOCUMENT-LINK: valida que o documento referenciado existe
    // como agregado ContractDocument antes de mutar o amendment.
    const docLookup = await deps.documentRepo.findById(docIdResult.value);
    if (!docLookup.ok) return docLookup;
    if (docLookup.value === null) return err('signed-document-not-found');

    // DO D§21: parsePendingWithoutDocument na borda — narrowa para o subtipo correto.
    const pendingWithoutDoc = Amendment.parsePendingWithoutDocument(load.value);
    if (!pendingWithoutDoc.ok) return pendingWithoutDoc;

    const attached = Amendment.attachSignedDocument(pendingWithoutDoc.value, docIdResult.value);
    if (!attached.ok) return attached;

    // CA-5: evento passado diretamente no save — persiste state + outbox atomicamente.
    const saveResult = await deps.amendmentRepo.save(attached.value.amendment, [
      attached.value.event,
    ]);
    if (!saveResult.ok) return saveResult;

    return ok({
      amendment: attached.value.amendment,
      event: attached.value.event,
    });
  };
