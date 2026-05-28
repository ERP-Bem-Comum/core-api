/**
 * Tests para `src/modules/financial/domain/payable/errors.ts`.
 *
 * Tagged errors (DO D§22-D§24):
 *  - Cada variante é record `{ tag: 'PascalCase'; ...payload }`.
 *  - Constructor functions em camelCase retornam a variante.
 *  - Union pública `PayableError = ...`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as PayableError from '#src/modules/financial/domain/payable/errors.ts';

describe('PayableError — tagged errors constructors', () => {
  it('payableSourceDocumentRequired returns tag', () => {
    assert.equal(PayableError.payableSourceDocumentRequired().tag, 'PayableSourceDocumentRequired');
  });

  it('payableValueZero returns tag', () => {
    assert.equal(PayableError.payableValueZero().tag, 'PayableValueZero');
  });

  it('payableInvalidDueDate returns tag', () => {
    assert.equal(PayableError.payableInvalidDueDate().tag, 'PayableInvalidDueDate');
  });

  it('payableInvalidOpenedAt returns tag', () => {
    assert.equal(PayableError.payableInvalidOpenedAt().tag, 'PayableInvalidOpenedAt');
  });

  it('payableInvalidApprovalDate has no payload (malformação)', () => {
    const e = PayableError.payableInvalidApprovalDate();
    assert.equal(e.tag, 'PayableInvalidApprovalDate');
  });

  it('payableApprovalDateBeforeOpenedAt carries opened/attempted dates as evidence (D23)', () => {
    const opened = new Date('2026-05-20T00:00:00Z');
    const attempted = new Date('2026-05-19T00:00:00Z');
    const e = PayableError.payableApprovalDateBeforeOpenedAt(opened, attempted);
    assert.equal(e.tag, 'PayableApprovalDateBeforeOpenedAt');
    assert.equal(e.openedAt, opened);
    assert.equal(e.attemptedAt, attempted);
  });

  it('payableNotOpen carries currentStatus as evidence (D23)', () => {
    const e = PayableError.payableNotOpen('Approved');
    assert.equal(e.tag, 'PayableNotOpen');
    assert.equal(e.currentStatus, 'Approved');
  });

  it('payableNotApproved/Transmitted/Rejected/Overdue carry currentStatus', () => {
    const a = PayableError.payableNotApproved('Open');
    assert.equal(a.tag, 'PayableNotApproved');
    assert.equal(a.currentStatus, 'Open');

    const t = PayableError.payableNotTransmitted('Approved');
    assert.equal(t.tag, 'PayableNotTransmitted');
    assert.equal(t.currentStatus, 'Approved');

    const r = PayableError.payableNotRejected('Transmitted');
    assert.equal(r.tag, 'PayableNotRejected');
    assert.equal(r.currentStatus, 'Transmitted');

    const o = PayableError.payableNotOverdue('Transmitted');
    assert.equal(o.tag, 'PayableNotOverdue');
    assert.equal(o.currentStatus, 'Transmitted');
  });

  it('payableInvalidTransmissionDate/RejectionDate/OverdueDate/ResetDate (sem payload — malformação)', () => {
    assert.equal(
      PayableError.payableInvalidTransmissionDate().tag,
      'PayableInvalidTransmissionDate',
    );
    assert.equal(PayableError.payableInvalidRejectionDate().tag, 'PayableInvalidRejectionDate');
    assert.equal(PayableError.payableInvalidOverdueDate().tag, 'PayableInvalidOverdueDate');
    assert.equal(PayableError.payableInvalidResetDate().tag, 'PayableInvalidResetDate');
  });

  it('payableTransmissionDateBeforeApprovedAt carries openedAt/attempted (D23)', () => {
    const approved = new Date('2026-05-25T00:00:00Z');
    const attempted = new Date('2026-05-24T00:00:00Z');
    const e = PayableError.payableTransmissionDateBeforeApprovedAt(approved, attempted);
    assert.equal(e.tag, 'PayableTransmissionDateBeforeApprovedAt');
    assert.equal(e.approvedAt, approved);
    assert.equal(e.attemptedAt, attempted);
  });

  it('payableRejectionDateBeforeTransmittedAt carries transmittedAt/attempted (D23)', () => {
    const transmitted = new Date('2026-05-26T00:00:00Z');
    const attempted = new Date('2026-05-25T00:00:00Z');
    const e = PayableError.payableRejectionDateBeforeTransmittedAt(transmitted, attempted);
    assert.equal(e.tag, 'PayableRejectionDateBeforeTransmittedAt');
    assert.equal(e.transmittedAt, transmitted);
    assert.equal(e.attemptedAt, attempted);
  });

  it('payableOverdueBeforeDueDate carries dueDate/attempted (D23 — R5 do handbook)', () => {
    const due = new Date('2026-06-15T00:00:00Z');
    const attempted = new Date('2026-06-15T00:00:00Z'); // mesma data, ainda não venceu
    const e = PayableError.payableOverdueBeforeDueDate(due, attempted);
    assert.equal(e.tag, 'PayableOverdueBeforeDueDate');
    assert.equal(e.dueDate, due);
    assert.equal(e.attemptedAt, attempted);
  });

  it('payableResetDateBeforeRejectedAt carries rejectedAt/attempted (D23)', () => {
    const rejected = new Date('2026-05-27T00:00:00Z');
    const attempted = new Date('2026-05-26T00:00:00Z');
    const e = PayableError.payableResetDateBeforeRejectedAt(rejected, attempted);
    assert.equal(e.tag, 'PayableResetDateBeforeRejectedAt');
    assert.equal(e.rejectedAt, rejected);
    assert.equal(e.attemptedAt, attempted);
  });

  it('payableRejectionReasonRequired/TooLong (validação)', () => {
    assert.equal(
      PayableError.payableRejectionReasonRequired().tag,
      'PayableRejectionReasonRequired',
    );
    assert.equal(PayableError.payableRejectionReasonTooLong().tag, 'PayableRejectionReasonTooLong');
  });

  it('payableNotPaid / payableNotTransmittedOrOverdue carry currentStatus (precondicionais)', () => {
    const p = PayableError.payableNotPaid('Approved');
    assert.equal(p.tag, 'PayableNotPaid');
    assert.equal(p.currentStatus, 'Approved');

    const to = PayableError.payableNotTransmittedOrOverdue('Open');
    assert.equal(to.tag, 'PayableNotTransmittedOrOverdue');
    assert.equal(to.currentStatus, 'Open');
  });

  it('payableInvalid*Date (malformação — sem payload)', () => {
    assert.equal(
      PayableError.payableInvalidManualPaymentDate().tag,
      'PayableInvalidManualPaymentDate',
    );
    assert.equal(PayableError.payableInvalidBankOutflowDate().tag, 'PayableInvalidBankOutflowDate');
    assert.equal(PayableError.payableInvalidBankPaymentDate().tag, 'PayableInvalidBankPaymentDate');
    assert.equal(PayableError.payableInvalidSettlementDate().tag, 'PayableInvalidSettlementDate');
  });

  it('payableManualPaymentDateBeforeApprovedAt carries approvedAt/attempted (D23)', () => {
    const approved = new Date('2026-05-25T00:00:00Z');
    const attempted = new Date('2026-05-24T00:00:00Z');
    const e = PayableError.payableManualPaymentDateBeforeApprovedAt(approved, attempted);
    assert.equal(e.tag, 'PayableManualPaymentDateBeforeApprovedAt');
    assert.equal(e.approvedAt, approved);
    assert.equal(e.attemptedAt, attempted);
  });

  it('payableBankOutflowDateBeforeTransmittedAt carries transmittedAt/attempted (D23)', () => {
    const transmitted = new Date('2026-05-26T00:00:00Z');
    const attempted = new Date('2026-05-25T00:00:00Z');
    const e = PayableError.payableBankOutflowDateBeforeTransmittedAt(transmitted, attempted);
    assert.equal(e.tag, 'PayableBankOutflowDateBeforeTransmittedAt');
    assert.equal(e.transmittedAt, transmitted);
    assert.equal(e.attemptedAt, attempted);
  });

  it('payableSettlementDateBeforePaidAt carries paidAt/attempted (D23 — R6)', () => {
    const paid = new Date('2026-05-27T00:00:00Z');
    const attempted = new Date('2026-05-26T00:00:00Z');
    const e = PayableError.payableSettlementDateBeforePaidAt(paid, attempted);
    assert.equal(e.tag, 'PayableSettlementDateBeforePaidAt');
    assert.equal(e.paidAt, paid);
    assert.equal(e.attemptedAt, attempted);
  });

  it('PayableError union has 30 variants — exhaustive switch (próximo do threshold de refactor)', () => {
    const handle = (e: PayableError.PayableError): string => {
      switch (e.tag) {
        // Core (FIN-AGG-PAYABLE-CORE)
        case 'PayableSourceDocumentRequired':
          return 'src-doc';
        case 'PayableValueZero':
          return 'value-zero';
        case 'PayableInvalidDueDate':
          return 'due-date';
        case 'PayableInvalidOpenedAt':
          return 'opened-at';
        case 'PayableInvalidApprovalDate':
          return 'approval-date-malformed';
        case 'PayableApprovalDateBeforeOpenedAt':
          return 'approval-date-before-opened';
        case 'PayableNotOpen':
          return 'not-open';
        // NotX precondicionais (transmission)
        case 'PayableNotApproved':
          return 'not-approved';
        case 'PayableNotTransmitted':
          return 'not-transmitted';
        case 'PayableNotRejected':
          return 'not-rejected';
        case 'PayableNotOverdue':
          return 'not-overdue';
        // Malformação dates (transmission)
        case 'PayableInvalidTransmissionDate':
          return 'tx-date-malformed';
        case 'PayableInvalidRejectionDate':
          return 'rej-date-malformed';
        case 'PayableInvalidOverdueDate':
          return 'over-date-malformed';
        case 'PayableInvalidResetDate':
          return 'reset-date-malformed';
        // Timing
        case 'PayableTransmissionDateBeforeApprovedAt':
          return 'tx-before-approved';
        case 'PayableRejectionDateBeforeTransmittedAt':
          return 'rej-before-tx';
        case 'PayableOverdueBeforeDueDate':
          return 'over-before-due';
        case 'PayableResetDateBeforeRejectedAt':
          return 'reset-before-rej';
        // Rejection reason
        case 'PayableRejectionReasonRequired':
          return 'reason-req';
        case 'PayableRejectionReasonTooLong':
          return 'reason-long';
        // Payment (FIN-AGG-PAYABLE-PAYMENT)
        case 'PayableNotPaid':
          return 'not-paid';
        case 'PayableNotTransmittedOrOverdue':
          return 'not-tx-or-overdue';
        case 'PayableInvalidManualPaymentDate':
          return 'manual-pay-malformed';
        case 'PayableManualPaymentDateBeforeApprovedAt':
          return 'manual-pay-before-approved';
        case 'PayableInvalidBankOutflowDate':
          return 'bank-outflow-malformed';
        case 'PayableInvalidBankPaymentDate':
          return 'bank-paydate-malformed';
        case 'PayableBankOutflowDateBeforeTransmittedAt':
          return 'bank-outflow-before-tx';
        case 'PayableInvalidSettlementDate':
          return 'settle-malformed';
        case 'PayableSettlementDateBeforePaidAt':
          return 'settle-before-paid';
        default: {
          const _exhaustive: never = e;
          return _exhaustive;
        }
      }
    };
    assert.equal(typeof handle, 'function');
  });
});
