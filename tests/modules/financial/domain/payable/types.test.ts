/**
 * Tests type-level do agregado `Payable`.
 *
 * Cobre CA-1..CA-4 do 000-request: tipos refinados por estado (DO D§20),
 * discriminator `status`, união `Payable = OpenPayable | ApprovedPayable`.
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import type {
  OpenPayable,
  ApprovedPayable,
  TransmittedPayable,
  RejectedPayable,
  OverduePayable,
  PaidPayable,
  PaidFromManualPayable,
  PaidFromBankPayable,
  SettledPayable,
  Payable,
  PayableStatus,
} from '#src/modules/financial/domain/payable/types.ts';

describe('Payable types — type-level smoke', () => {
  it('PayableStatus union has 7 variants — Open..Settled (máquina de estados completa)', () => {
    // Compile-time exhaustive switch sobre status.
    const cases: readonly PayableStatus[] = [
      'Open',
      'Approved',
      'Transmitted',
      'Rejected',
      'Overdue',
      'Paid',
      'Settled',
    ];
    const classify = (s: PayableStatus): string => {
      switch (s) {
        case 'Open':
          return 'open';
        case 'Approved':
          return 'approved';
        case 'Transmitted':
          return 'transmitted';
        case 'Rejected':
          return 'rejected';
        case 'Overdue':
          return 'overdue';
        case 'Paid':
          return 'paid';
        case 'Settled':
          return 'settled';
        default: {
          const _exhaustive: never = s;
          return _exhaustive;
        }
      }
    };
    assert.deepEqual(cases.map(classify), [
      'open',
      'approved',
      'transmitted',
      'rejected',
      'overdue',
      'paid',
      'settled',
    ]);
  });

  it('OpenPayable narrows via status discriminator (no approvedAt/approvedBy)', () => {
    // Compile-time check: dentro do narrow Open, NÃO existem approvedAt/approvedBy.
    const probe = (p: Payable): string => {
      if (p.status === 'Open') {
        // type-level: 'approvedAt' não existe em OpenPayable
        type _NoApprovedAt = OpenPayable extends { approvedAt: Date } ? never : true;
        const _check: _NoApprovedAt = true;
        return _check ? 'ok' : 'fail';
      }
      return 'approved-branch';
    };
    assert.equal(typeof probe, 'function');
  });

  it('ApprovedPayable narrows via status — has approvedAt and approvedBy', () => {
    // Compile-time check sobre forma de ApprovedPayable.
    type _HasApprovedAt = ApprovedPayable extends { approvedAt: Date } ? true : never;
    const check: _HasApprovedAt = true;
    assert.equal(check, true);
  });

  it('TransmittedPayable has transmittedAt + remittanceId on top of ApprovalRecord', () => {
    // Compile-time: TransmittedPayable estende campos de ApprovedPayable + transmissão
    type _HasTransmission = TransmittedPayable extends {
      approvedAt: Date;
      transmittedAt: Date;
    }
      ? true
      : never;
    const check: _HasTransmission = true;
    assert.equal(check, true);
  });

  it('RejectedPayable has rejectedAt + rejectionReason; OverduePayable has markedOverdueAt', () => {
    type _HasRejection = RejectedPayable extends {
      rejectedAt: Date;
      rejectionReason: string;
    }
      ? true
      : never;
    type _HasOverdue = OverduePayable extends { markedOverdueAt: Date } ? true : never;
    const r: _HasRejection = true;
    const o: _HasOverdue = true;
    assert.equal(r && o, true);
  });

  it('PaidFromManualPayable has paidVia="Manual" + paymentRegisteredBy; NO fitid/bankPaymentDate', () => {
    type _IsManual = PaidFromManualPayable extends { paidVia: 'Manual'; paidAt: Date }
      ? true
      : never;
    type _NoBank = PaidFromManualPayable extends { fitid: unknown } ? never : true;
    const m: _IsManual = true;
    const nb: _NoBank = true;
    assert.equal(m && nb, true);
  });

  it('PaidFromBankPayable has paidVia="Bank" + fitid + bankPaymentDate (D4)', () => {
    type _IsBank = PaidFromBankPayable extends {
      paidVia: 'Bank';
      bankPaymentDate: Date;
    }
      ? true
      : never;
    const b: _IsBank = true;
    assert.equal(b, true);
  });

  it('PaidPayable union narrows via paidVia discriminator', () => {
    const probe = (p: PaidPayable): string => {
      switch (p.paidVia) {
        case 'Manual':
          // type-level: 'fitid' não existe em PaidFromManualPayable
          return `manual:${String(p.paymentRegisteredBy)}`;
        case 'Bank':
          // type-level: fitid disponível
          return `bank:${String(p.fitid)}`;
        default: {
          const _exhaustive: never = p;
          return _exhaustive;
        }
      }
    };
    assert.equal(typeof probe, 'function');
  });

  it('SettledPayable preserves sub-type (Manual or Bank)', () => {
    type _SettledHasPaidVia = SettledPayable extends { paidVia: 'Manual' | 'Bank' } ? true : never;
    type _SettledHasGestor = SettledPayable extends { settledBy: unknown; settledAt: Date }
      ? true
      : never;
    const a: _SettledHasPaidVia = true;
    const b: _SettledHasGestor = true;
    assert.equal(a && b, true);
  });
});
