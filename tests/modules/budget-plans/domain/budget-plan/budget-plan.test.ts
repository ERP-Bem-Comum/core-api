/**
 * BGP-PLAN-CRUD — W0 (RED) — agregado BudgetPlan (issue #315, US1).
 *
 * DEVE FALHAR: src/modules/budget-plans/ ainda não existe. GREEN quando o W1
 * entregar o agregado puro (create nasce RASCUNHO v1.0; invariante de no máx.
 * 1 orçamento por parceiro — estado XOR município; total = Σ budgets).
 */

import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOk, isErr } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import {
  ProgramRef,
  PartnerStateRef,
  PartnerMunicipalityRef,
} from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import type { CreateBudgetPlanInput } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import * as PlanVersion from '#src/modules/budget-plans/domain/budget-plan/version.ts';
import type { BudgetPartner } from '#src/modules/budget-plans/domain/budget-plan/types.ts';

const NOW = new Date('2026-07-02T12:00:00.000Z');

const PROGRAM_REF_RAW = '11111111-1111-4111-8111-111111111111';
const STATE_CE_RAW = '44444444-4444-4444-8444-444444444444';
const MUN_FORTALEZA_RAW = '55555555-5555-4555-8555-555555555555';

const programRef = () => {
  const r = ProgramRef.rehydrate(PROGRAM_REF_RAW);
  assert.ok(isOk(r));
  return r.value;
};

const statePartner = (): BudgetPartner => {
  const r = PartnerStateRef.rehydrate(STATE_CE_RAW);
  assert.ok(isOk(r));
  return { kind: 'state', ref: r.value };
};

const municipalityPartner = (): BudgetPartner => {
  const r = PartnerMunicipalityRef.rehydrate(MUN_FORTALEZA_RAW);
  assert.ok(isOk(r));
  return { kind: 'municipality', ref: r.value };
};

const cents = (raw: number) => {
  const r = Money.fromCents(raw);
  assert.ok(isOk(r));
  return r.value;
};

const validInput = (over: Partial<CreateBudgetPlanInput> = {}): CreateBudgetPlanInput => ({
  id: BudgetPlanId.generate(),
  year: 2026,
  programRef: programRef(),
  now: NOW,
  ...over,
});

const makePlan = (over: Partial<CreateBudgetPlanInput> = {}) => {
  const r = BudgetPlan.create(validInput(over));
  assert.ok(isOk(r));
  return r.value.plan;
};

describe('PlanVersion', () => {
  it('initial() formata "1.0"', () => {
    assert.equal(PlanVersion.format(PlanVersion.initial()), '1.0');
  });

  it('formata major/minor arbitrários ("2.1")', () => {
    assert.equal(PlanVersion.format({ major: 2, minor: 1 }), '2.1');
  });
});

describe('BudgetPlan.create', () => {
  it('CA1: input válido -> RASCUNHO v1.0, zero budgets, total 0, BudgetPlanCreated', () => {
    const r = BudgetPlan.create(validInput());
    assert.ok(isOk(r));
    assert.equal(r.value.plan.status, 'RASCUNHO');
    assert.equal(PlanVersion.format(r.value.plan.version), '1.0');
    assert.equal(r.value.plan.year, 2026);
    assert.equal(r.value.plan.budgets.length, 0);
    assert.equal(BudgetPlan.total(r.value.plan).cents, 0);
    assert.equal(r.value.plan.createdAt.getTime(), NOW.getTime());
    assert.equal(r.value.event.type, 'BudgetPlanCreated');
  });

  it('rejeita ano fora da faixa plausível -> budget-plan-invalid-year', () => {
    const r = BudgetPlan.create(validInput({ year: 1800 }));
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-invalid-year');
  });

  it('rejeita ano não-inteiro -> budget-plan-invalid-year', () => {
    const r = BudgetPlan.create(validInput({ year: 2026.5 }));
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-invalid-year');
  });
});

describe('BudgetPlan.addBudget', () => {
  it('CA4: budgets por Rede somam o total do plano (estado + município)', () => {
    const p0 = makePlan();
    const r1 = BudgetPlan.addBudget(
      p0,
      { id: BudgetId.generate(), partner: statePartner(), value: cents(50_000) },
      NOW,
    );
    assert.ok(isOk(r1));
    const r2 = BudgetPlan.addBudget(
      r1.value.plan,
      { id: BudgetId.generate(), partner: municipalityPartner(), value: cents(30_000) },
      NOW,
    );
    assert.ok(isOk(r2));
    assert.equal(r2.value.plan.budgets.length, 2);
    assert.equal(BudgetPlan.total(r2.value.plan).cents, 80_000);
  });

  it('invariante: no máx. 1 orçamento por estado parceiro -> budget-plan-duplicate-partner', () => {
    const p0 = makePlan();
    const r1 = BudgetPlan.addBudget(
      p0,
      { id: BudgetId.generate(), partner: statePartner(), value: cents(50_000) },
      NOW,
    );
    assert.ok(isOk(r1));
    const dup = BudgetPlan.addBudget(
      r1.value.plan,
      { id: BudgetId.generate(), partner: statePartner(), value: cents(10_000) },
      NOW,
    );
    assert.ok(isErr(dup));
    assert.equal(dup.error, 'budget-plan-duplicate-partner');
  });

  it('invariante: no máx. 1 orçamento por município parceiro -> budget-plan-duplicate-partner', () => {
    const p0 = makePlan();
    const r1 = BudgetPlan.addBudget(
      p0,
      { id: BudgetId.generate(), partner: municipalityPartner(), value: cents(20_000) },
      NOW,
    );
    assert.ok(isOk(r1));
    const dup = BudgetPlan.addBudget(
      r1.value.plan,
      { id: BudgetId.generate(), partner: municipalityPartner(), value: cents(5_000) },
      NOW,
    );
    assert.ok(isErr(dup));
    assert.equal(dup.error, 'budget-plan-duplicate-partner');
  });
});

describe('refs cross-BC (rehydrate-only)', () => {
  it('ProgramRef rejeita não-UUID -> budget-plan-ref-invalid', () => {
    const r = ProgramRef.rehydrate('nao-e-uuid');
    assert.ok(isErr(r));
    assert.equal(r.error, 'budget-plan-ref-invalid');
  });

  it('PartnerStateRef e PartnerMunicipalityRef aceitam UUID v4', () => {
    assert.ok(isOk(PartnerStateRef.rehydrate(STATE_CE_RAW)));
    assert.ok(isOk(PartnerMunicipalityRef.rehydrate(MUN_FORTALEZA_RAW)));
  });
});
