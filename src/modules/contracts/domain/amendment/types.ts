import type { Brand } from '../../../../shared/brand.ts';
import type { AmendmentId, ContractId, DocumentId, UserRef } from '../shared/ids.ts';
import type { Money } from '../shared/money.ts';

export type AmendmentStatus = 'Pending' | 'Homologated';

export type AmendmentKind = 'Addition' | 'Suppression' | 'TermChange' | 'Misc';

type AmendmentBase = Readonly<{
  id: AmendmentId;
  contractId: ContractId;
  amendmentNumber: string;
  description: string;
  createdAt: Date;
  status: AmendmentStatus;
  signedDocumentRef: DocumentId | null;
  homologatedAt: Date | null;
  homologatedBy: UserRef | null;
}>;

type AmendmentVariant = Readonly<
  | { kind: 'Addition'; impactValue: Money }
  | { kind: 'Suppression'; impactValue: Money }
  | { kind: 'TermChange'; newEndDate: Date }
  | { kind: 'Misc' }
>;

export type Amendment = Brand<AmendmentBase & AmendmentVariant, 'Amendment'>;

type CreateAmendmentInputBase = Readonly<{
  id: AmendmentId;
  contractId: ContractId;
  amendmentNumber: string;
  description: string;
  createdAt: Date;
}>;

export type CreateAmendmentInput = CreateAmendmentInputBase &
  Readonly<
    | { kind: 'Addition'; impactValue: Money }
    | { kind: 'Suppression'; impactValue: Money }
    | { kind: 'TermChange'; newEndDate: Date }
    | { kind: 'Misc' }
  >;
