import type { AmendmentId, ContractId, DocumentId } from '../shared/ids.ts';
import type { UserRef } from '../../../../shared/kernel/user-ref.ts';

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
