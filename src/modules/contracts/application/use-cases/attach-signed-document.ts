import { type Result, ok, err } from '../../../../shared/result.ts';
import {
  AmendmentId,
  DocumentId,
  type AmendmentIdError,
  type DocumentIdError,
} from '../../domain/shared/ids.ts';
import { Amendment } from '../../domain/amendment/amendment.ts';
import type { Amendment as AmendmentEntity } from '../../domain/amendment/types.ts';
import type { AmendmentEvent } from '../../domain/amendment/events.ts';
import type { AmendmentError } from '../../domain/amendment/errors.ts';
import type {
  AmendmentRepository,
  AmendmentRepositoryError,
} from '../ports/amendment-repository.ts';
import type { EventBus, EventBusError } from '../ports/event-bus.ts';

export type AttachSignedDocumentCommand = Readonly<{
  amendmentId: string;
  signedDocumentRef: string;
}>;

export type AttachSignedDocumentError =
  | AmendmentIdError
  | DocumentIdError
  | 'amendment-not-found'
  | AmendmentError
  | AmendmentRepositoryError
  | EventBusError;

export type AttachSignedDocumentOutput = Readonly<{
  amendment: AmendmentEntity;
  event: AmendmentEvent;
}>;

type Deps = Readonly<{
  amendmentRepo: AmendmentRepository;
  eventBus: EventBus;
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

    const attached = Amendment.attachSignedDocument(load.value, docIdResult.value);
    if (!attached.ok) return attached;

    const saveResult = await deps.amendmentRepo.save(attached.value.amendment);
    if (!saveResult.ok) return saveResult;

    const publishResult = await deps.eventBus.publish(attached.value.event);
    if (!publishResult.ok) return publishResult;

    return ok({
      amendment: attached.value.amendment,
      event: attached.value.event,
    });
  };
