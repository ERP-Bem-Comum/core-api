/**
 * Tests do agregado `Payable` — operações `open`, `approve`, `parseOpen`, `parseApproved`.
 *
 * Cobre CA-7..CA-22 do 000-request.
 *
 * Fixtures usam VOs/IDs já validados (predecessores closed-green):
 *  - PayableId
 *  - SourceDocumentRef
 *  - Money (shared/kernel)
 *  - BeneficiaryBankData (com TaxId embedded)
 *  - UserRef (shared/kernel)
 *
 * IIFE com throw aceitável em código de teste (regra "zero throw" aplica ao src/).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import { isErr, isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as FITID from '#src/modules/financial/domain/shared/fitid.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as RemittanceId from '#src/modules/financial/domain/shared/remittance-id.ts';
import * as SourceDocumentRef from '#src/modules/financial/domain/shared/source-document-ref.ts';
import * as BeneficiaryBankData from '#src/modules/financial/domain/shared/beneficiary-bank-data.ts';
import * as TaxId from '#src/modules/financial/domain/shared/tax-id.ts';
import { Payable } from '#src/modules/financial/domain/payable/payable.ts';
import type { OpenPayableInput } from '#src/modules/financial/domain/payable/types.ts';

// ─── Fixtures ──────────────────────────────────────────────────────────

const D = (iso: string): Date => new Date(iso);
const INVALID_DATE = new Date('not-a-date');

const VALID_TAX_ID = ((): TaxId.CPF => {
  const r = TaxId.fromCpf('11144477735');
  if (!r.ok) throw new Error(`fixture VALID_TAX_ID broken: ${r.error}`);
  return r.value;
})();

const VALID_BENEFICIARY = ((): BeneficiaryBankData.BeneficiaryBankData => {
  const r = BeneficiaryBankData.fromRaw({
    bankCode: '341',
    agency: '1234-5',
    account: '12345-6',
    holderTaxId: VALID_TAX_ID,
    holderName: 'Fornecedor X Ltda',
  });
  if (!r.ok) throw new Error(`fixture VALID_BENEFICIARY broken: ${r.error}`);
  return r.value;
})();

const VALID_MONEY = ((): Money.Money => {
  const r = Money.fromCents(15050);
  if (!r.ok) throw new Error(`fixture VALID_MONEY broken: ${r.error}`);
  return r.value;
})();

const APPROVER = ((): UserRef.UserRef => {
  const r = UserRef.rehydrate('a1b2c3d4-5678-4abc-9def-fedcba987654');
  if (!r.ok) throw new Error(`fixture APPROVER broken: ${r.error}`);
  return r.value;
})();

const validInput = (overrides: Partial<OpenPayableInput> = {}): OpenPayableInput => ({
  id: PayableId.generate(),
  sourceDocumentId: SourceDocumentRef.generate(),
  kind: 'Principal',
  paymentMethod: 'BankRemittance',
  beneficiary: VALID_BENEFICIARY,
  value: VALID_MONEY,
  dueDate: D('2026-06-15T00:00:00Z'),
  openedAt: D('2026-05-20T00:00:00Z'),
  ...overrides,
});

const openPayable = () => {
  const r = Payable.open(validInput());
  if (!r.ok) throw new Error(`fixture openPayable broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};

// ─── Fixtures de transmissão (FIN-AGG-PAYABLE-TRANSMISSION) ────────────

const APPROVAL_DATE = D('2026-05-25T00:00:00Z');
const TRANSMISSION_DATE = D('2026-05-26T00:00:00Z');
const REJECTION_DATE = D('2026-05-27T00:00:00Z');
const OVERDUE_DATE = D('2026-06-16T00:00:00Z'); // > dueDate (15/06)
const VALID_REJECTION_REASON = 'Agencia/conta invalida (motivo Bradesco AG)';

const approvedPayable = () => {
  const open = openPayable();
  const r = Payable.approve(open, APPROVER, APPROVAL_DATE);
  if (!r.ok) throw new Error(`fixture approvedPayable broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};

const transmittedPayable = () => {
  const approved = approvedPayable();
  const r = Payable.transmit(approved, RemittanceId.generate(), TRANSMISSION_DATE);
  if (!r.ok) throw new Error(`fixture transmittedPayable broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};

const rejectedPayable = () => {
  const transmitted = transmittedPayable();
  const r = Payable.registerRejection(transmitted, VALID_REJECTION_REASON, REJECTION_DATE);
  if (!r.ok) throw new Error(`fixture rejectedPayable broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};

// ─── Fixtures de pagamento (FIN-AGG-PAYABLE-PAYMENT) ───────────────────

const MANUAL_PAY_DATE = D('2026-05-26T00:00:00Z'); // > APPROVAL_DATE (25/05)
const BANK_OUTFLOW_DATE = D('2026-05-27T00:00:00Z'); // > TRANSMISSION_DATE (26/05)
const BANK_PAYMENT_DATE = D('2026-05-27T00:00:00Z');
const SETTLEMENT_DATE = D('2026-05-28T00:00:00Z');

// Reuso APPROVER (UserRef) para representar Operador e Gestor — todos são UserRef.
const OPERATOR = APPROVER;
const GESTOR = APPROVER;

const VALID_FITID = ((): FITID.FITID => {
  const r = FITID.fromString('FITID-BRADESCO-12345');
  if (!r.ok) throw new Error(`fixture VALID_FITID broken: ${r.error}`);
  return r.value;
})();

const manuallyPaidPayable = () => {
  const approved = approvedPayable();
  const r = Payable.registerManualPayment(approved, OPERATOR, MANUAL_PAY_DATE);
  if (!r.ok) throw new Error(`fixture manuallyPaidPayable broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};

const bankPaidPayable = () => {
  const transmitted = transmittedPayable();
  const r = Payable.processBankOutflow(
    transmitted,
    VALID_FITID,
    BANK_PAYMENT_DATE,
    BANK_OUTFLOW_DATE,
  );
  if (!r.ok) throw new Error(`fixture bankPaidPayable broken: ${JSON.stringify(r.error)}`);
  return r.value.payable;
};

// ─── open ──────────────────────────────────────────────────────────────

describe('Payable.open — happy path', () => {
  it('CA-7/CA-8: returns Open payable + PayableOpened event', () => {
    const input = validInput();
    const r = Payable.open(input);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { payable, event } = r.value;
    assert.equal(payable.status, 'Open');
    assert.equal(payable.id, input.id);
    assert.equal(payable.value.cents, input.value.cents);
    assert.equal(event.type, 'PayableOpened');
    if (event.type === 'PayableOpened') {
      assert.equal(event.payableId, payable.id);
      assert.equal(event.occurredAt, input.openedAt);
    }
  });

  it('CA-12: returned payable is frozen', () => {
    const r = Payable.open(validInput());
    if (!r.ok) return;
    assert.equal(Object.isFrozen(r.value.payable), true);
  });

  it('CA-13: Open payable has NO approvedAt / approvedBy', () => {
    const r = Payable.open(validInput());
    if (!r.ok) return;
    assert.equal('approvedAt' in r.value.payable, false);
    assert.equal('approvedBy' in r.value.payable, false);
  });
});

describe('Payable.open — validation', () => {
  it('CA-9: rejects value zero with PayableValueZero', () => {
    const zeroMoney = Money.fromCents(0);
    if (!zeroMoney.ok) return;
    const r = Payable.open(validInput({ value: zeroMoney.value }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableValueZero');
  });

  it('CA-10: rejects invalid dueDate with PayableInvalidDueDate', () => {
    const r = Payable.open(validInput({ dueDate: INVALID_DATE }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableInvalidDueDate');
  });

  it('CA-11: rejects invalid openedAt with PayableInvalidOpenedAt', () => {
    const r = Payable.open(validInput({ openedAt: INVALID_DATE }));
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableInvalidOpenedAt');
  });
});

// ─── approve ───────────────────────────────────────────────────────────

describe('Payable.approve — happy path', () => {
  it('CA-14/CA-15: Open → Approved with approvedAt and approvedBy', () => {
    const open = openPayable();
    const at = D('2026-05-25T00:00:00Z');
    const r = Payable.approve(open, APPROVER, at);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { payable, event } = r.value;
    assert.equal(payable.status, 'Approved');
    if (payable.status === 'Approved') {
      assert.equal(payable.approvedAt, at);
      assert.equal(payable.approvedBy, APPROVER);
    }
    assert.equal(event.type, 'PayableApproved');
    if (event.type === 'PayableApproved') {
      assert.equal(event.payableId, payable.id);
      assert.equal(event.occurredAt, at);
      assert.equal(event.approvedBy, APPROVER);
    }
  });

  it('CA-19: preserves Core fields (id, value, dueDate, beneficiary, kind)', () => {
    const open = openPayable();
    const at = D('2026-05-25T00:00:00Z');
    const r = Payable.approve(open, APPROVER, at);
    if (!r.ok) return;
    const a = r.value.payable;
    assert.equal(a.id, open.id);
    assert.equal(a.value.cents, open.value.cents);
    assert.equal(a.dueDate, open.dueDate);
    assert.equal(a.beneficiary, open.beneficiary);
    assert.equal(a.kind, open.kind);
    assert.equal(a.paymentMethod, open.paymentMethod);
    assert.equal(a.sourceDocumentId, open.sourceDocumentId);
    assert.equal(a.openedAt, open.openedAt);
  });
});

describe('Payable.approve — invariants', () => {
  it('CA-17: rejects approving already-Approved with PayableNotOpen', () => {
    const open = openPayable();
    const first = Payable.approve(open, APPROVER, D('2026-05-25T00:00:00Z'));
    if (!first.ok) return;
    const approved = first.value.payable;
    // tentar aprovar de novo
    const r = Payable.approve(
      approved as unknown as ReturnType<typeof openPayable>,
      APPROVER,
      D('2026-05-26T00:00:00Z'),
    );
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error.tag, 'PayableNotOpen');
      if (r.error.tag === 'PayableNotOpen') {
        assert.equal(r.error.currentStatus, 'Approved');
      }
    }
  });

  it('CA-18: rejects approvalDate < openedAt with PayableApprovalDateBeforeOpenedAt (timing)', () => {
    const open = openPayable(); // openedAt = 2026-05-20
    const earlier = D('2026-05-19T00:00:00Z');
    const r = Payable.approve(open, APPROVER, earlier);
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error.tag, 'PayableApprovalDateBeforeOpenedAt');
      if (r.error.tag === 'PayableApprovalDateBeforeOpenedAt') {
        assert.equal(r.error.openedAt, open.openedAt);
        assert.equal(r.error.attemptedAt, earlier);
      }
    }
  });

  it('CA-18: rejects malformed approvalDate with PayableInvalidApprovalDate (malformação)', () => {
    const open = openPayable();
    const r = Payable.approve(open, APPROVER, INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) {
      assert.equal(r.error.tag, 'PayableInvalidApprovalDate');
    }
  });
});

// ─── parseOpen / parseApproved ─────────────────────────────────────────

describe('Payable.parseOpen / parseApproved — refinement constructors', () => {
  it('CA-20: parseOpen accepts OpenPayable', () => {
    const open = openPayable();
    const r = Payable.parseOpen(open);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.status, 'Open');
  });

  it('CA-21: parseOpen rejects ApprovedPayable with currentStatus=Approved', () => {
    const open = openPayable();
    const approved = Payable.approve(open, APPROVER, D('2026-05-25T00:00:00Z'));
    if (!approved.ok) return;
    const r = Payable.parseOpen(approved.value.payable);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableNotOpen') {
      assert.equal(r.error.currentStatus, 'Approved');
    }
  });

  it('CA-22: parseApproved accepts ApprovedPayable', () => {
    const open = openPayable();
    const approved = Payable.approve(open, APPROVER, D('2026-05-25T00:00:00Z'));
    if (!approved.ok) return;
    const r = Payable.parseApproved(approved.value.payable);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.status, 'Approved');
  });

  it('CA-22: parseApproved rejects OpenPayable', () => {
    const open = openPayable();
    const r = Payable.parseApproved(open);
    assert.equal(isErr(r), true);
    // currentStatus deve ser 'Open'
    if (!r.ok && r.error.tag === 'PayableNotOpen') {
      assert.equal(r.error.currentStatus, 'Open');
    }
  });
});

// ─── transmit ──────────────────────────────────────────────────────────

describe('Payable.transmit — happy path', () => {
  it('CA-7/CA-11: Approved → Transmitted with remittanceId and PayableTransmitted event', () => {
    const approved = approvedPayable();
    const rid = RemittanceId.generate();
    const r = Payable.transmit(approved, rid, TRANSMISSION_DATE);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { payable, event } = r.value;
    assert.equal(payable.status, 'Transmitted');
    if (payable.status === 'Transmitted') {
      assert.equal(payable.transmittedAt, TRANSMISSION_DATE);
      assert.equal(payable.remittanceId, rid);
      assert.equal(payable.approvedAt, APPROVAL_DATE);
    }
    assert.equal(event.type, 'PayableTransmitted');
    if (event.type === 'PayableTransmitted') {
      assert.equal(event.remittanceId, rid);
      assert.equal(event.occurredAt, TRANSMISSION_DATE);
    }
  });
});

describe('Payable.transmit — invariants', () => {
  it('CA-8: rejects Open with PayableNotApproved(currentStatus=Open)', () => {
    const open = openPayable();
    const r = Payable.transmit(open, RemittanceId.generate(), TRANSMISSION_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableNotApproved') {
      assert.equal(r.error.currentStatus, 'Open');
    }
  });

  it('CA-9: rejects malformed date → PayableInvalidTransmissionDate', () => {
    const approved = approvedPayable();
    const r = Payable.transmit(approved, RemittanceId.generate(), INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableInvalidTransmissionDate');
  });

  it('CA-10: rejects at < approvedAt → PayableTransmissionDateBeforeApprovedAt', () => {
    const approved = approvedPayable();
    const earlier = D('2026-05-24T00:00:00Z'); // < APPROVAL_DATE
    const r = Payable.transmit(approved, RemittanceId.generate(), earlier);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableTransmissionDateBeforeApprovedAt') {
      assert.equal(r.error.approvedAt, APPROVAL_DATE);
      assert.equal(r.error.attemptedAt, earlier);
    }
  });
});

// ─── registerRejection ─────────────────────────────────────────────────

describe('Payable.registerRejection — happy path', () => {
  it('CA-12: Transmitted → Rejected with reason and PayableRejected event', () => {
    const transmitted = transmittedPayable();
    const r = Payable.registerRejection(transmitted, VALID_REJECTION_REASON, REJECTION_DATE);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { payable, event } = r.value;
    assert.equal(payable.status, 'Rejected');
    if (payable.status === 'Rejected') {
      assert.equal(payable.rejectedAt, REJECTION_DATE);
      assert.equal(payable.rejectionReason, VALID_REJECTION_REASON);
      // preserva campos de transmissão
      assert.equal(payable.transmittedAt, TRANSMISSION_DATE);
    }
    if (event.type === 'PayableRejected') {
      assert.equal(event.rejectionReason, VALID_REJECTION_REASON);
    }
  });
});

describe('Payable.registerRejection — invariants', () => {
  it('CA-13: rejects Approved with PayableNotTransmitted', () => {
    const approved = approvedPayable();
    const r = Payable.registerRejection(approved, VALID_REJECTION_REASON, REJECTION_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableNotTransmitted') {
      assert.equal(r.error.currentStatus, 'Approved');
    }
  });

  it('CA-14: rejects malformed date → PayableInvalidRejectionDate', () => {
    const transmitted = transmittedPayable();
    const r = Payable.registerRejection(transmitted, VALID_REJECTION_REASON, INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableInvalidRejectionDate');
  });

  it('CA-15: rejects at < transmittedAt → PayableRejectionDateBeforeTransmittedAt', () => {
    const transmitted = transmittedPayable();
    const earlier = D('2026-05-25T00:00:00Z'); // < TRANSMISSION_DATE
    const r = Payable.registerRejection(transmitted, VALID_REJECTION_REASON, earlier);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableRejectionDateBeforeTransmittedAt') {
      assert.equal(r.error.transmittedAt, TRANSMISSION_DATE);
      assert.equal(r.error.attemptedAt, earlier);
    }
  });

  it('CA-16: rejects empty reason → PayableRejectionReasonRequired', () => {
    const transmitted = transmittedPayable();
    const r = Payable.registerRejection(transmitted, '   ', REJECTION_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableRejectionReasonRequired');
  });

  it('CA-17: rejects reason > 500 chars → PayableRejectionReasonTooLong', () => {
    const transmitted = transmittedPayable();
    const longReason = 'A'.repeat(501);
    const r = Payable.registerRejection(transmitted, longReason, REJECTION_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableRejectionReasonTooLong');
  });
});

// ─── markOverdue ───────────────────────────────────────────────────────

describe('Payable.markOverdue — happy path', () => {
  it('CA-18: Transmitted → Overdue with markedOverdueAt and PayableMarkedOverdue event', () => {
    const transmitted = transmittedPayable();
    const r = Payable.markOverdue(transmitted, OVERDUE_DATE);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { payable, event } = r.value;
    assert.equal(payable.status, 'Overdue');
    if (payable.status === 'Overdue') {
      assert.equal(payable.markedOverdueAt, OVERDUE_DATE);
    }
    assert.equal(event.type, 'PayableMarkedOverdue');
  });
});

describe('Payable.markOverdue — invariants', () => {
  it('CA-19: rejects Approved with PayableNotTransmitted', () => {
    const approved = approvedPayable();
    const r = Payable.markOverdue(approved, OVERDUE_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableNotTransmitted') {
      assert.equal(r.error.currentStatus, 'Approved');
    }
  });

  it('CA-20: rejects malformed date → PayableInvalidOverdueDate', () => {
    const transmitted = transmittedPayable();
    const r = Payable.markOverdue(transmitted, INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableInvalidOverdueDate');
  });

  it('CA-21: rejects at <= dueDate (R5 handbook) → PayableOverdueBeforeDueDate', () => {
    const transmitted = transmittedPayable();
    // dueDate é 2026-06-15; tentar marcar overdue no mesmo dia ainda não venceu
    const sameDay = D('2026-06-15T00:00:00Z');
    const r = Payable.markOverdue(transmitted, sameDay);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableOverdueBeforeDueDate') {
      assert.equal(r.error.dueDate, transmitted.dueDate);
      assert.equal(r.error.attemptedAt, sameDay);
    }
  });
});

// ─── resetToApproved ───────────────────────────────────────────────────

describe('Payable.resetToApproved — happy path', () => {
  it('CA-22..CA-25: Rejected → Approved, drops tx fields, event carries previous info', () => {
    const rejected = rejectedPayable();
    const resetDate = D('2026-05-28T00:00:00Z');
    const r = Payable.resetToApproved(rejected, resetDate);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { payable, event } = r.value;
    assert.equal(payable.status, 'Approved');
    if (payable.status === 'Approved') {
      // CA-23: mantém approvedAt + approvedBy originais
      assert.equal(payable.approvedAt, APPROVAL_DATE);
      assert.equal(payable.approvedBy, APPROVER);
      // CA-24: campos de transmissão/rejeição AUSENTES
      assert.equal('transmittedAt' in payable, false);
      assert.equal('remittanceId' in payable, false);
      assert.equal('rejectedAt' in payable, false);
      assert.equal('rejectionReason' in payable, false);
    }
    // CA-25: evento carrega auditoria
    if (event.type === 'PayableResetToApproved') {
      assert.equal(event.previousRejectionReason, VALID_REJECTION_REASON);
      assert.equal(event.previousRemittanceId, rejected.remittanceId);
    }
  });
});

describe('Payable.resetToApproved — invariants', () => {
  it('CA-26: rejects Approved with PayableNotRejected', () => {
    const approved = approvedPayable();
    const r = Payable.resetToApproved(approved, D('2026-05-28T00:00:00Z'));
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableNotRejected') {
      assert.equal(r.error.currentStatus, 'Approved');
    }
  });

  it('rejects malformed reset date → PayableInvalidResetDate', () => {
    const rejected = rejectedPayable();
    const r = Payable.resetToApproved(rejected, INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableInvalidResetDate');
  });

  it('rejects at < rejectedAt → PayableResetDateBeforeRejectedAt', () => {
    const rejected = rejectedPayable();
    const earlier = D('2026-05-26T00:00:00Z'); // < REJECTION_DATE
    const r = Payable.resetToApproved(rejected, earlier);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableResetDateBeforeRejectedAt') {
      assert.equal(r.error.rejectedAt, REJECTION_DATE);
      assert.equal(r.error.attemptedAt, earlier);
    }
  });
});

// ─── Refinement constructors (CA-27..CA-29) ────────────────────────────

describe('Payable.parseTransmitted / parseRejected / parseOverdue', () => {
  it('CA-27: parseTransmitted accepts Transmitted, rejects others', () => {
    const transmitted = transmittedPayable();
    const r = Payable.parseTransmitted(transmitted);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.status, 'Transmitted');

    const approved = approvedPayable();
    const r2 = Payable.parseTransmitted(approved);
    assert.equal(isErr(r2), true);
    if (!r2.ok && r2.error.tag === 'PayableNotTransmitted') {
      assert.equal(r2.error.currentStatus, 'Approved');
    }
  });

  it('CA-28: parseRejected accepts Rejected', () => {
    const rejected = rejectedPayable();
    const r = Payable.parseRejected(rejected);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.status, 'Rejected');
  });

  it('CA-29: parseOverdue accepts Overdue', () => {
    const transmitted = transmittedPayable();
    const overdue = Payable.markOverdue(transmitted, OVERDUE_DATE);
    if (!overdue.ok) return;
    const r = Payable.parseOverdue(overdue.value.payable);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.status, 'Overdue');
  });
});

// ─── registerManualPayment ─────────────────────────────────────────────

describe('Payable.registerManualPayment — happy path', () => {
  it('CA-7/CA-11: Approved → PaidFromManual; sem fitid/bankPaymentDate; evento PayablePaidManually', () => {
    const approved = approvedPayable();
    const r = Payable.registerManualPayment(approved, OPERATOR, MANUAL_PAY_DATE);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { payable, event } = r.value;
    assert.equal(payable.status, 'Paid');
    if (payable.status === 'Paid') {
      assert.equal(payable.paidVia, 'Manual');
      if (payable.paidVia === 'Manual') {
        assert.equal(payable.paidAt, MANUAL_PAY_DATE);
        assert.equal(payable.paymentRegisteredBy, OPERATOR);
      }
      // CA-11: SEM fitid/bankPaymentDate
      assert.equal('fitid' in payable, false);
      assert.equal('bankPaymentDate' in payable, false);
    }
    if (event.type === 'PayablePaidManually') {
      assert.equal(event.paymentRegisteredBy, OPERATOR);
      assert.equal(event.paidAt, MANUAL_PAY_DATE);
    }
  });
});

describe('Payable.registerManualPayment — invariants', () => {
  it('CA-8: rejects Open with PayableNotApproved', () => {
    const open = openPayable();
    const r = Payable.registerManualPayment(open, OPERATOR, MANUAL_PAY_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableNotApproved') {
      assert.equal(r.error.currentStatus, 'Open');
    }
  });

  it('CA-9: rejects malformed date → PayableInvalidManualPaymentDate', () => {
    const approved = approvedPayable();
    const r = Payable.registerManualPayment(approved, OPERATOR, INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableInvalidManualPaymentDate');
  });

  it('CA-10: rejects paidAt < approvedAt → PayableManualPaymentDateBeforeApprovedAt', () => {
    const approved = approvedPayable();
    const earlier = D('2026-05-24T00:00:00Z'); // < APPROVAL_DATE
    const r = Payable.registerManualPayment(approved, OPERATOR, earlier);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableManualPaymentDateBeforeApprovedAt') {
      assert.equal(r.error.approvedAt, APPROVAL_DATE);
      assert.equal(r.error.attemptedAt, earlier);
    }
  });
});

// ─── processBankOutflow ────────────────────────────────────────────────

describe('Payable.processBankOutflow — happy path', () => {
  it('CA-12: Transmitted → PaidFromBank; carries fitid + bankPaymentDate', () => {
    const transmitted = transmittedPayable();
    const r = Payable.processBankOutflow(
      transmitted,
      VALID_FITID,
      BANK_PAYMENT_DATE,
      BANK_OUTFLOW_DATE,
    );
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { payable, event } = r.value;
    assert.equal(payable.status, 'Paid');
    if (payable.status === 'Paid' && payable.paidVia === 'Bank') {
      // CA-18: tem fitid + bankPaymentDate
      assert.equal(payable.fitid, VALID_FITID);
      assert.equal(payable.bankPaymentDate, BANK_PAYMENT_DATE);
      assert.equal(payable.paidAt, BANK_OUTFLOW_DATE);
      // Preserva transmissão
      assert.equal(payable.transmittedAt, TRANSMISSION_DATE);
    }
    if (event.type === 'PayableBankOutflowConfirmed') {
      assert.equal(event.fitid, VALID_FITID);
      assert.equal(event.bankPaymentDate, BANK_PAYMENT_DATE);
    }
  });

  it('CA-13: Overdue → PaidFromBank (confirmação tardia — D3 handbook §6)', () => {
    const transmitted = transmittedPayable();
    const overdue = Payable.markOverdue(transmitted, OVERDUE_DATE);
    if (!overdue.ok) return;
    const r = Payable.processBankOutflow(
      overdue.value.payable,
      VALID_FITID,
      BANK_PAYMENT_DATE,
      D('2026-06-17T00:00:00Z'), // após overdue
    );
    assert.equal(isOk(r), true);
    if (r.ok && r.value.payable.status === 'Paid' && r.value.payable.paidVia === 'Bank') {
      assert.equal(r.value.payable.fitid, VALID_FITID);
    }
  });
});

describe('Payable.processBankOutflow — invariants', () => {
  it('CA-14: rejects Open with PayableNotTransmittedOrOverdue', () => {
    const open = openPayable();
    const r = Payable.processBankOutflow(open, VALID_FITID, BANK_PAYMENT_DATE, BANK_OUTFLOW_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableNotTransmittedOrOverdue') {
      assert.equal(r.error.currentStatus, 'Open');
    }
  });

  it('CA-14: rejects Approved with PayableNotTransmittedOrOverdue', () => {
    const approved = approvedPayable();
    const r = Payable.processBankOutflow(
      approved,
      VALID_FITID,
      BANK_PAYMENT_DATE,
      BANK_OUTFLOW_DATE,
    );
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableNotTransmittedOrOverdue');
  });

  it('CA-15: rejects malformed occurredAt → PayableInvalidBankOutflowDate', () => {
    const transmitted = transmittedPayable();
    const r = Payable.processBankOutflow(transmitted, VALID_FITID, BANK_PAYMENT_DATE, INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableInvalidBankOutflowDate');
  });

  it('CA-16: rejects malformed bankPaymentDate → PayableInvalidBankPaymentDate', () => {
    const transmitted = transmittedPayable();
    const r = Payable.processBankOutflow(transmitted, VALID_FITID, INVALID_DATE, BANK_OUTFLOW_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableInvalidBankPaymentDate');
  });

  it('CA-17: rejects occurredAt < transmittedAt → PayableBankOutflowDateBeforeTransmittedAt', () => {
    const transmitted = transmittedPayable();
    const earlier = D('2026-05-25T00:00:00Z'); // < TRANSMISSION_DATE
    const r = Payable.processBankOutflow(transmitted, VALID_FITID, BANK_PAYMENT_DATE, earlier);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableBankOutflowDateBeforeTransmittedAt') {
      assert.equal(r.error.transmittedAt, TRANSMISSION_DATE);
      assert.equal(r.error.attemptedAt, earlier);
    }
  });
});

// ─── authorizeSettlement ───────────────────────────────────────────────

describe('Payable.authorizeSettlement — happy path', () => {
  it('CA-20/CA-24: PaidFromManual → SettledFromManual preserva sub-type', () => {
    const paid = manuallyPaidPayable();
    const r = Payable.authorizeSettlement(paid, GESTOR, SETTLEMENT_DATE);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { payable, event } = r.value;
    assert.equal(payable.status, 'Settled');
    if (payable.status === 'Settled') {
      assert.equal(payable.settledAt, SETTLEMENT_DATE);
      assert.equal(payable.settledBy, GESTOR);
      // Sub-type Manual preservado
      assert.equal(payable.paidVia, 'Manual');
      // Sem fitid (era Manual)
      assert.equal('fitid' in payable, false);
    }
    if (event.type === 'PayableSettled') {
      assert.equal(event.settledBy, GESTOR);
    }
  });

  it('CA-25: PaidFromBank → SettledFromBank preserva fitid/bankPaymentDate', () => {
    const paid = bankPaidPayable();
    const r = Payable.authorizeSettlement(paid, GESTOR, SETTLEMENT_DATE);
    assert.equal(isOk(r), true);
    if (!r.ok) return;
    const { payable } = r.value;
    if (payable.status === 'Settled' && payable.paidVia === 'Bank') {
      assert.equal(payable.fitid, VALID_FITID);
      assert.equal(payable.bankPaymentDate, BANK_PAYMENT_DATE);
    }
  });
});

describe('Payable.authorizeSettlement — invariants', () => {
  it('CA-21: rejects Approved with PayableNotPaid', () => {
    const approved = approvedPayable();
    const r = Payable.authorizeSettlement(approved, GESTOR, SETTLEMENT_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableNotPaid') {
      assert.equal(r.error.currentStatus, 'Approved');
    }
  });

  it('CA-22: rejects malformed date → PayableInvalidSettlementDate', () => {
    const paid = manuallyPaidPayable();
    const r = Payable.authorizeSettlement(paid, GESTOR, INVALID_DATE);
    assert.equal(isErr(r), true);
    if (!r.ok) assert.equal(r.error.tag, 'PayableInvalidSettlementDate');
  });

  it('CA-23: rejects settledAt < paidAt → PayableSettlementDateBeforePaidAt', () => {
    const paid = manuallyPaidPayable();
    const earlier = D('2026-05-25T00:00:00Z'); // < MANUAL_PAY_DATE
    const r = Payable.authorizeSettlement(paid, GESTOR, earlier);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableSettlementDateBeforePaidAt') {
      assert.equal(r.error.paidAt, MANUAL_PAY_DATE);
      assert.equal(r.error.attemptedAt, earlier);
    }
  });
});

// ─── parsePaid / parseSettled ──────────────────────────────────────────

describe('Payable.parsePaid / parseSettled — refinement constructors', () => {
  it('CA-26: parsePaid accepts both Manual and Bank sub-types', () => {
    const manual = manuallyPaidPayable();
    const rm = Payable.parsePaid(manual);
    assert.equal(isOk(rm), true);
    if (rm.ok) assert.equal(rm.value.status, 'Paid');

    const bank = bankPaidPayable();
    const rb = Payable.parsePaid(bank);
    assert.equal(isOk(rb), true);
  });

  it('CA-26: parsePaid rejects Approved with PayableNotPaid', () => {
    const approved = approvedPayable();
    const r = Payable.parsePaid(approved);
    assert.equal(isErr(r), true);
    if (!r.ok && r.error.tag === 'PayableNotPaid') {
      assert.equal(r.error.currentStatus, 'Approved');
    }
  });

  it('CA-27: parseSettled accepts SettledPayable', () => {
    const paid = bankPaidPayable();
    const settled = Payable.authorizeSettlement(paid, GESTOR, SETTLEMENT_DATE);
    if (!settled.ok) return;
    const r = Payable.parseSettled(settled.value.payable);
    assert.equal(isOk(r), true);
    if (r.ok) assert.equal(r.value.status, 'Settled');
  });
});
