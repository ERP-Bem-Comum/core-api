import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';

import * as Money from '#src/shared/kernel/money.ts';
// Alçada do aprovador (#289): checkApprover (US1/POLICY) + escalate (US3/CASCADE).
import {
  checkApprover,
  escalate,
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

  it('CA3 (#299): canApprove sem limite (limit null) → ok — opt-in, não fail-closed', () => {
    const r = checkApprover(money(10000), authority(true, null));
    assert.equal(r.ok, true);
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

// US3 (CASCADE #289) — escalate encaminha ao próximo aprovador com alçada suficiente.
// Dois erros (decisão 2): só o indicado (length<=1) → approver-limit-exceeded; >1 e nenhum → no-approver-with-sufficient-limit.
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const C = '44444444-4444-4444-8444-444444444444';
const cand = (id: string, canApprove: boolean, limitCents: number | null): ApproverAuthority => ({
  userId: id,
  canApprove,
  limit: limitCents === null ? null : money(limitCents),
});

describe('financial/domain/document/approval-policy — escalate (US3 cascata)', () => {
  it('CA1: encaminha ao único suficiente (A 1k insuf., B 10k; net 5k) → B', () => {
    const r = escalate(money(5000), [cand(A, true, 1000), cand(B, true, 10000)]);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.userId, B);
  });

  it('CA2: múltiplos suficientes → o de MENOR limite (B 10k, C 6k; net 5k) → C', () => {
    const r = escalate(money(5000), [cand(B, true, 10000), cand(C, true, 6000)]);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.userId, C);
  });

  it('CA3: ignora sem permissão (canApprove false) e sem alçada (limit null)', () => {
    const r = escalate(money(5000), [
      cand(A, false, 100000),
      cand(B, true, null),
      cand(C, true, 6000),
    ]);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.userId, C);
  });

  it('CA4a: nenhum suficiente e >1 candidato → no-approver-with-sufficient-limit', () => {
    const r = escalate(money(5000), [cand(A, true, 1000), cand(B, true, 2000)]);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.error, 'no-approver-with-sufficient-limit');
  });

  it('CA4b: nenhum suficiente e só o indicado (length<=1) → approver-limit-exceeded', () => {
    const r1 = escalate(money(5000), [cand(A, true, 1000)]);
    assert.equal(r1.ok, false);
    if (!r1.ok) assert.equal(r1.error, 'approver-limit-exceeded');
    const r0 = escalate(money(5000), []);
    assert.equal(r0.ok, false);
    if (!r0.ok) assert.equal(r0.error, 'approver-limit-exceeded');
  });

  it('CA5: empate de limite ≥ líquido → estável por ordem de entrada (primeiro)', () => {
    const r = escalate(money(5000), [cand(B, true, 8000), cand(C, true, 8000)]);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.value.userId, B);
  });
});
