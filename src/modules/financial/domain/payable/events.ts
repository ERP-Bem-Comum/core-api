/**
 * Eventos de domínio do agregado `Payable`.
 *
 * PascalCase passado (DO D§24). `occurredAt` é injetado pelo caller (não
 * `new Date()` — DO B§14).
 *
 * **9 variants (máquina de estados completa):**
 *   - `PayableOpened` — Open
 *   - `PayableApproved` — Open → Approved
 *   - `PayableTransmitted` — Approved → Transmitted
 *   - `PayableRejected` — Transmitted → Rejected
 *   - `PayableMarkedOverdue` — Transmitted → Overdue
 *   - `PayableResetToApproved` — Rejected → Approved (auditoria de tentativa)
 *   - `PayablePaidManually` — Approved → Paid Manual
 *   - `PayableBankOutflowConfirmed` — Transmitted/Overdue → Paid Bank (R5 evidência)
 *   - `PayableSettled` — Paid → Settled (R6 Crivo Humano)
 */

import type { UserRef } from '#src/shared/kernel/user-ref.ts';
import type { FITID } from '../shared/fitid.ts';
import type { PayableId } from '../shared/payable-id.ts';
import type { RemittanceId } from '../shared/remittance-id.ts';

export type PayableEvent = Readonly<
  | { type: 'PayableOpened'; payableId: PayableId; occurredAt: Date }
  | {
      type: 'PayableApproved';
      payableId: PayableId;
      occurredAt: Date;
      approvedBy: UserRef;
    }
  | {
      type: 'PayableTransmitted';
      payableId: PayableId;
      occurredAt: Date;
      remittanceId: RemittanceId;
    }
  | {
      type: 'PayableRejected';
      payableId: PayableId;
      occurredAt: Date;
      rejectionReason: string;
    }
  | { type: 'PayableMarkedOverdue'; payableId: PayableId; occurredAt: Date }
  | {
      type: 'PayableResetToApproved';
      payableId: PayableId;
      occurredAt: Date;
      previousRejectionReason: string;
      previousRemittanceId: RemittanceId;
    }
  | {
      type: 'PayablePaidManually';
      payableId: PayableId;
      occurredAt: Date;
      paidAt: Date;
      paymentRegisteredBy: UserRef;
    }
  | {
      type: 'PayableBankOutflowConfirmed';
      payableId: PayableId;
      occurredAt: Date;
      fitid: FITID;
      bankPaymentDate: Date;
    }
  | {
      type: 'PayableSettled';
      payableId: PayableId;
      occurredAt: Date;
      settledBy: UserRef;
    }
>;
