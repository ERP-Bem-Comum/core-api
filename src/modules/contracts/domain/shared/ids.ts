import { type Result, ok, err } from '../../../../shared/result.ts';
import { isUuidV4, newUuid } from '../../../../shared/id.ts';
import type { Brand } from '../../../../shared/brand.ts';

export type ContractId = Brand<string, 'ContractId'>;
export type AmendmentId = Brand<string, 'AmendmentId'>;
export type DocumentId = Brand<string, 'DocumentId'>;
export type UserRef = Brand<string, 'UserRef'>;

export type ContractIdError = 'contract-id-invalid';
export type AmendmentIdError = 'amendment-id-invalid';
export type DocumentIdError = 'document-id-invalid';
export type UserRefError = 'user-ref-invalid';

export const ContractId = {
  generate: (): ContractId => newUuid() as ContractId,
  rehydrate: (raw: string): Result<ContractId, ContractIdError> =>
    isUuidV4(raw) ? ok(raw as ContractId) : err('contract-id-invalid'),
};

export const AmendmentId = {
  generate: (): AmendmentId => newUuid() as AmendmentId,
  rehydrate: (raw: string): Result<AmendmentId, AmendmentIdError> =>
    isUuidV4(raw) ? ok(raw as AmendmentId) : err('amendment-id-invalid'),
};

export const DocumentId = {
  generate: (): DocumentId => newUuid() as DocumentId,
  rehydrate: (raw: string): Result<DocumentId, DocumentIdError> =>
    isUuidV4(raw) ? ok(raw as DocumentId) : err('document-id-invalid'),
};

export const UserRef = {
  rehydrate: (raw: string): Result<UserRef, UserRefError> =>
    isUuidV4(raw) ? ok(raw as UserRef) : err('user-ref-invalid'),
};
