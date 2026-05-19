import type { AmendmentId, ContractId, DocumentId, UserRef } from '../shared/ids.ts';

export type AmendmentEvent = Readonly<
  | {
      type: 'AmendmentCreated';
      amendmentId: AmendmentId;
      contractId: ContractId;
      occurredAt: Date;
    }
  | {
      type: 'AmendmentDocumentAttached';
      amendmentId: AmendmentId;
      signedDocumentRef: DocumentId;
      occurredAt: Date;
    }
  | {
      type: 'AmendmentHomologated';
      amendmentId: AmendmentId;
      homologatedBy: UserRef;
      occurredAt: Date;
    }
>;
