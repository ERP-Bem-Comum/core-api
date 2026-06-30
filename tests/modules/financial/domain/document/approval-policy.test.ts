import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
// W0 RED (FIN-APPROVER-LIMIT-POLICY #289): approval-policy ainda não existe.
import {
  checkApprover,
  type ApproverAuthority,
} from '#src/modules/financial/domain/document/approval-policy.ts';

const money = (n: number): Money.Money => {
  const r = Money.fromCents(n);
  if (!r.ok) throw new Error('test setup: money');
  return r.value;
};

const APPROVER = '33333333-3333-4333-8333-333333333333';

// authority com alçada (limit Money|null), canApprove configurável.
const authority = (canApprove: boolean, limitCents: number | null): ApproverAuthority => ({
  userId: APPROVER,
  canApprove,
  limit: limitCents === null ? null : money(limitCents),
});

// US1 — checkApprover valida o aprovador indicado contra o valor líquido.
// Tabela-verdade (000-request CA1–CA5). escalate/cascata é o ticket CASCADE.
describe('financial/domain/document/approval-policy — checkApprover (US1)', () => {
  it('CA1: authority null → approver-not-found', () => {
    const r = checkApprover(money(10000), null);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'approver-not-found');
  });

  it('CA2: canApprove false → approver-missing-permission', () => {
    const r = checkApprover(money(10000), authority(false, 50000));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'approver-missing-permission');
  });

  it('CA3: canApprove sem alçada (limit null) → approver-limit-exceeded (FR-008 fail-closed)', () => {
    const r = checkApprover(money(10000), authority(true, null));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'approver-limit-exceeded');
  });

  it('CA4: limit < netValue → approver-limit-exceeded', () => {
    const r = checkApprover(money(10000), authority(true, 9999));
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'approver-limit-exceeded');
  });

  it('CA5: limit === netValue (fronteira) → ok', () => {
    const r = checkApprover(money(10000), authority(true, 10000));
    assert.equal(r.ok, true);
  });

  it('CA5: limit > netValue → ok', () => {
    const r = checkApprover(money(10000), authority(true, 20000));
    assert.equal(r.ok, true);
  });
});
