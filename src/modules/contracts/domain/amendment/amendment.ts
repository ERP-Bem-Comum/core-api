import { type Result, ok, err } from '../../../../shared/result.ts';
import { isValidDate } from '../../../../shared/utils/date.ts';
import { isBlank } from '../../../../shared/utils/string.ts';
import type { DocumentId, UserRef } from '../shared/ids.ts';
import type { Amendment as AmendmentEntity, CreateAmendmentInput } from './types.ts';
import type { AmendmentEvent } from './events.ts';
import type { AmendmentError } from './errors.ts';

type CommandOutput = Readonly<{
  amendment: AmendmentEntity;
  event: AmendmentEvent;
}>;

const assertPending = (
  amendment: AmendmentEntity,
): Result<AmendmentEntity, 'amendment-not-pending'> =>
  amendment.status === 'Pending' ? ok(amendment) : err('amendment-not-pending');

const assertValidEventDate = (at: Date): Result<Date, 'amendment-invalid-event-date'> =>
  isValidDate(at) ? ok(at) : err('amendment-invalid-event-date');

const validateCommonInput = (input: CreateAmendmentInput): Result<true, AmendmentError> => {
  if (isBlank(input.amendmentNumber)) {
    return err('amendment-number-required');
  }
  if (isBlank(input.description)) return err('amendment-description-required');
  if (!isValidDate(input.createdAt)) return err('amendment-invalid-created-at');
  return ok(true);
};

const validateVariantInput = (input: CreateAmendmentInput): Result<true, AmendmentError> => {
  switch (input.kind) {
    case 'Addition':
    case 'Suppression':
      if (input.impactValue.cents === 0) return err('amendment-impact-value-zero');
      return ok(true);
    case 'TermChange':
      if (!isValidDate(input.newEndDate)) {
        return err('amendment-invalid-new-end-date');
      }
      return ok(true);
    case 'Misc':
      return ok(true);
  }
  // Exhaustive: TS valida em compile time todas as variantes.
};

const create = (input: CreateAmendmentInput): Result<CommandOutput, AmendmentError> => {
  const common = validateCommonInput(input);
  if (!common.ok) return common;
  const variant = validateVariantInput(input);
  if (!variant.ok) return variant;

  const base = {
    id: input.id,
    contractId: input.contractId,
    amendmentNumber: input.amendmentNumber,
    description: input.description,
    createdAt: input.createdAt,
    status: 'Pending' as const,
    signedDocumentRef: null,
    homologatedAt: null,
    homologatedBy: null,
  };

  const amendment = (input.kind === 'Addition'
    ? { ...base, kind: 'Addition' as const, impactValue: input.impactValue }
    : input.kind === 'Suppression'
      ? { ...base, kind: 'Suppression' as const, impactValue: input.impactValue }
      : input.kind === 'TermChange'
        ? { ...base, kind: 'TermChange' as const, newEndDate: input.newEndDate }
        : { ...base, kind: 'Misc' as const }) as unknown as AmendmentEntity;

  const event: AmendmentEvent = {
    type: 'AmendmentCreated',
    amendmentId: input.id,
    contractId: input.contractId,
    occurredAt: input.createdAt,
  };

  return ok({ amendment, event });
};

const attachSignedDocument = (
  amendment: AmendmentEntity,
  signedDocumentRef: DocumentId,
): Result<CommandOutput, AmendmentError> => {
  const pendingCheck = assertPending(amendment);
  if (!pendingCheck.ok) return pendingCheck;

  if (amendment.signedDocumentRef !== null) {
    return err('amendment-document-already-attached');
  }

  const next = {
    ...amendment,
    signedDocumentRef,
  } as unknown as AmendmentEntity;

  const event: AmendmentEvent = {
    type: 'AmendmentDocumentAttached',
    amendmentId: amendment.id,
    signedDocumentRef,
    occurredAt: amendment.createdAt,
  };

  return ok({ amendment: next, event });
};

const homologate = (
  amendment: AmendmentEntity,
  by: UserRef,
  at: Date,
): Result<CommandOutput, AmendmentError> => {
  const pendingCheck = assertPending(amendment);
  if (!pendingCheck.ok) return pendingCheck;
  const atCheck = assertValidEventDate(at);
  if (!atCheck.ok) return atCheck;

  if (amendment.signedDocumentRef === null) {
    return err('amendment-without-signed-document');
  }

  const next = {
    ...amendment,
    status: 'Homologated',
    homologatedAt: at,
    homologatedBy: by,
  } as unknown as AmendmentEntity;

  const event: AmendmentEvent = {
    type: 'AmendmentHomologated',
    amendmentId: amendment.id,
    homologatedBy: by,
    occurredAt: at,
  };

  return ok({ amendment: next, event });
};

export const Amendment = {
  create,
  attachSignedDocument,
  homologate,
};
