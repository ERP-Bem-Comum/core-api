/**
 * Tests do payload de eventos do agregado `Payable`.
 *
 * Cobre CA-6: union `PayableEvent` com 2 variantes + shape de cada payload.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as FITID from '#src/modules/financial/domain/shared/fitid.ts';
import * as PayableId from '#src/modules/financial/domain/shared/payable-id.ts';
import * as RemittanceId from '#src/modules/financial/domain/shared/remittance-id.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import type { PayableEvent } from '#src/modules/financial/domain/payable/events.ts';

describe('PayableEvent — discriminated union', () => {
  it('union has 9 variants (exhaustive switch)', () => {
    // Compile-time exhaustive switch obriga atualização ao adicionar variante.
    const handle = (e: PayableEvent): string => {
      switch (e.type) {
        case 'PayableOpened':
          return 'opened';
        case 'PayableApproved':
          return 'approved';
        case 'PayableTransmitted':
          return 'transmitted';
        case 'PayableRejected':
          return 'rejected';
        case 'PayableMarkedOverdue':
          return 'overdue';
        case 'PayableResetToApproved':
          return 'reset';
        case 'PayablePaidManually':
          return 'paid-manual';
        case 'PayableBankOutflowConfirmed':
          return 'paid-bank';
        case 'PayableSettled':
          return 'settled';
        default: {
          const _exhaustive: never = e;
          return _exhaustive;
        }
      }
    };
    assert.equal(typeof handle, 'function');
  });

  it('PayableOpened carries payableId + occurredAt and NO approvedBy', () => {
    const e: PayableEvent = {
      type: 'PayableOpened',
      payableId: PayableId.generate(),
      occurredAt: new Date('2026-05-20T00:00:00Z'),
    };
    assert.equal(e.type, 'PayableOpened');
    assert.equal('approvedBy' in e, false, 'PayableOpened NÃO deve carregar approvedBy');
    assert.equal('payableId' in e, true);
    assert.equal('occurredAt' in e, true);
  });

  it('PayableApproved carries payableId + occurredAt + approvedBy', () => {
    const userRefResult = UserRef.rehydrate('a1b2c3d4-5678-4abc-9def-fedcba987654');
    if (!userRefResult.ok) return;
    const e: PayableEvent = {
      type: 'PayableApproved',
      payableId: PayableId.generate(),
      occurredAt: new Date('2026-05-25T00:00:00Z'),
      approvedBy: userRefResult.value,
    };
    assert.equal(e.type, 'PayableApproved');
    assert.equal('approvedBy' in e, true, 'PayableApproved DEVE carregar approvedBy');
    if (e.type === 'PayableApproved') {
      assert.equal(e.approvedBy, userRefResult.value);
    }
  });

  it('PayableTransmitted carries remittanceId', () => {
    const rid = RemittanceId.generate();
    const e: PayableEvent = {
      type: 'PayableTransmitted',
      payableId: PayableId.generate(),
      occurredAt: new Date('2026-05-26T00:00:00Z'),
      remittanceId: rid,
    };
    assert.equal(e.type, 'PayableTransmitted');
    if (e.type === 'PayableTransmitted') {
      assert.equal(e.remittanceId, rid);
    }
  });

  it('PayableRejected carries rejectionReason', () => {
    const e: PayableEvent = {
      type: 'PayableRejected',
      payableId: PayableId.generate(),
      occurredAt: new Date('2026-05-27T00:00:00Z'),
      rejectionReason: 'Agencia/conta invalida',
    };
    if (e.type === 'PayableRejected') {
      assert.equal(e.rejectionReason, 'Agencia/conta invalida');
    }
  });

  it('PayableMarkedOverdue carries only payableId + occurredAt', () => {
    const e: PayableEvent = {
      type: 'PayableMarkedOverdue',
      payableId: PayableId.generate(),
      occurredAt: new Date('2026-06-16T00:00:00Z'),
    };
    assert.equal(e.type, 'PayableMarkedOverdue');
    assert.equal('rejectionReason' in e, false);
    assert.equal('remittanceId' in e, false);
  });

  it('PayableResetToApproved carries previousRejectionReason + previousRemittanceId (D5 — auditoria)', () => {
    const previousRid = RemittanceId.generate();
    const e: PayableEvent = {
      type: 'PayableResetToApproved',
      payableId: PayableId.generate(),
      occurredAt: new Date('2026-05-28T00:00:00Z'),
      previousRejectionReason: 'Conta invalida',
      previousRemittanceId: previousRid,
    };
    if (e.type === 'PayableResetToApproved') {
      assert.equal(e.previousRejectionReason, 'Conta invalida');
      assert.equal(e.previousRemittanceId, previousRid);
    }
  });

  it('PayablePaidManually carries paidAt + paymentRegisteredBy', () => {
    const userRefResult = UserRef.rehydrate('a1b2c3d4-5678-4abc-9def-fedcba987654');
    if (!userRefResult.ok) return;
    const paidAt = new Date('2026-05-27T00:00:00Z');
    const e: PayableEvent = {
      type: 'PayablePaidManually',
      payableId: PayableId.generate(),
      occurredAt: paidAt,
      paidAt,
      paymentRegisteredBy: userRefResult.value,
    };
    if (e.type === 'PayablePaidManually') {
      assert.equal(e.paidAt, paidAt);
      assert.equal(e.paymentRegisteredBy, userRefResult.value);
    }
  });

  it('PayableBankOutflowConfirmed carries fitid + bankPaymentDate (R5 evidência)', () => {
    const fitidResult = FITID.fromString('FITID-BRADESCO-12345');
    if (!fitidResult.ok) return;
    const bankPaymentDate = new Date('2026-05-26T00:00:00Z');
    const e: PayableEvent = {
      type: 'PayableBankOutflowConfirmed',
      payableId: PayableId.generate(),
      occurredAt: new Date('2026-05-27T00:00:00Z'),
      fitid: fitidResult.value,
      bankPaymentDate,
    };
    if (e.type === 'PayableBankOutflowConfirmed') {
      assert.equal(e.fitid, fitidResult.value);
      assert.equal(e.bankPaymentDate, bankPaymentDate);
    }
  });

  it('PayableSettled carries settledBy (R6 — Crivo Humano)', () => {
    const userRefResult = UserRef.rehydrate('b1b2c3d4-5678-4abc-9def-fedcba987654');
    if (!userRefResult.ok) return;
    const e: PayableEvent = {
      type: 'PayableSettled',
      payableId: PayableId.generate(),
      occurredAt: new Date('2026-05-28T00:00:00Z'),
      settledBy: userRefResult.value,
    };
    if (e.type === 'PayableSettled') {
      assert.equal(e.settledBy, userRefResult.value);
    }
  });
});
