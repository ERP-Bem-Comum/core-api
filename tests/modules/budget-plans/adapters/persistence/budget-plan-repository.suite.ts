import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';
import { randomUUID } from 'node:crypto';

import { isOk } from '#src/shared/primitives/result.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import {
  ProgramRef,
  PartnerStateRef,
  PartnerMunicipalityRef,
} from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import type { BudgetPlanRepository } from '#src/modules/budget-plans/domain/budget-plan/repository.ts';

export interface BudgetPlanRepoFactory {
  make: () => Promise<{ repo: BudgetPlanRepository; teardown?: () => Promise<void> }>;
}

const NOW = new Date('2026-07-02T12:00:00.000Z');

const mkProgramRef = () => {
  const r = ProgramRef.rehydrate(randomUUID());
  assert.ok(isOk(r));
  return r.value;
};

export const runBudgetPlanRepositoryContract = (
  label: string,
  factory: BudgetPlanRepoFactory,
): void => {
  describe(`BudgetPlanRepository contract — ${label}`, () => {
    let repo: BudgetPlanRepository;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repo = built.repo;
      teardown = built.teardown;
    });

    afterEach(async () => {
      if (teardown) await teardown();
    });

    const createPlan = (over: Readonly<{ year?: number; programRef?: ProgramRef }> = {}) => {
      const created = BudgetPlan.create({
        id: BudgetPlanId.generate(),
        year: over.year ?? 2026,
        programRef: over.programRef ?? mkProgramRef(),
        now: NOW,
      });
      assert.ok(isOk(created));
      return created.value;
    };

    it('save + findById faz round-trip do plano e dos budgets', async () => {
      const { plan, event } = createPlan({ year: 2026 });

      const moneyR = Money.fromCents(150_000);
      assert.ok(isOk(moneyR));
      const stateRef = PartnerStateRef.rehydrate('CE');
      assert.ok(isOk(stateRef));

      const withBudget = BudgetPlan.addBudget(
        plan,
        {
          id: BudgetId.generate(),
          partner: { kind: 'state', ref: stateRef.value },
          value: moneyR.value,
        },
        NOW,
      );
      assert.ok(isOk(withBudget));

      const saved = await repo.save(withBudget.value.plan, [event]);
      assert.ok(isOk(saved));

      const found = await repo.findById(plan.id);
      assert.ok(isOk(found));
      assert.ok(found.value !== null);
      assert.equal(found.value.status, 'RASCUNHO');
      assert.equal(found.value.version.major, 1);
      assert.equal(found.value.version.minor, 0);
      assert.equal(found.value.budgets.length, 1);
      assert.equal(found.value.budgets[0]?.value.cents, 150_000);
      assert.equal(found.value.budgets[0]?.partner.kind, 'state');
      assert.equal(String(found.value.budgets[0]?.partner.ref), String(stateRef.value));
    });

    it('findById de id inexistente retorna null (não erro)', async () => {
      const found = await repo.findById(BudgetPlanId.generate());
      assert.ok(isOk(found));
      assert.equal(found.value, null);
    });

    it('findRootByYearAndProgram encontra o plano raiz por (year, programRef)', async () => {
      const programRef = mkProgramRef();
      const { plan, event } = createPlan({ year: 2027, programRef });
      assert.ok(isOk(await repo.save(plan, [event])));

      const found = await repo.findRootByYearAndProgram(2027, programRef);
      assert.ok(isOk(found));
      assert.ok(found.value !== null);
      assert.equal(String(found.value.id), String(plan.id));

      const none = await repo.findRootByYearAndProgram(2027, mkProgramRef());
      assert.ok(isOk(none));
      assert.equal(none.value, null);
    });

    it('listPaged: paginacao com total pos-filtro', async () => {
      for (let i = 0; i < 3; i++) {
        const { plan, event } = createPlan({ year: 2000 + i });
        assert.ok(isOk(await repo.save(plan, [event])));
      }
      const page = await repo.listPaged({ page: 1, limit: 2 });
      assert.ok(isOk(page));
      assert.equal(page.value.items.length, 2);
      assert.equal(page.value.total, 3);
    });

    it('listPaged: filtro status', async () => {
      const { plan: p1, event: e1 } = createPlan({ year: 2030 });
      assert.ok(isOk(await repo.save(p1, [e1])));
      const { plan: p2, event: e2 } = createPlan({ year: 2031 });
      assert.ok(isOk(await repo.save(p2, [e2])));

      const rascunhos = await repo.listPaged({ page: 1, limit: 10, status: 'RASCUNHO' });
      assert.ok(isOk(rascunhos));
      assert.equal(rascunhos.value.total, 2);

      const aprovados = await repo.listPaged({ page: 1, limit: 10, status: 'APROVADO' });
      assert.ok(isOk(aprovados));
      assert.equal(aprovados.value.total, 0);
    });

    it('listPaged: filtro programRef', async () => {
      const ref = mkProgramRef();
      const { plan, event } = createPlan({ year: 2040, programRef: ref });
      assert.ok(isOk(await repo.save(plan, [event])));
      const { plan: other, event: eOther } = createPlan({ year: 2041 });
      assert.ok(isOk(await repo.save(other, [eOther])));

      const filtered = await repo.listPaged({ page: 1, limit: 10, programRef: ref });
      assert.ok(isOk(filtered));
      assert.equal(filtered.value.total, 1);
      assert.equal(String(filtered.value.items[0]?.programRef), String(ref));
    });

    it('listPaged: ordena por updatedAt DESC', async () => {
      const { plan: older, event: e1 } = createPlan({ year: 2010 });
      assert.ok(isOk(await repo.save(older, [e1])));
      const { plan: newer, event: e2 } = createPlan({ year: 2011 });
      const bumped = { ...newer, updatedAt: new Date(NOW.getTime() + 60_000) };
      assert.ok(isOk(await repo.save(bumped, [e2])));

      const page = await repo.listPaged({ page: 1, limit: 10 });
      assert.ok(isOk(page));
      assert.equal(String(page.value.items[0]?.id), String(newer.id));
    });

    it('listYears retorna anos distintos ordenados', async () => {
      const { plan: p1, event: e1 } = createPlan({ year: 2050 });
      assert.ok(isOk(await repo.save(p1, [e1])));
      const { plan: p2, event: e2 } = createPlan({ year: 2048 });
      assert.ok(isOk(await repo.save(p2, [e2])));
      const { plan: p3, event: e3 } = createPlan({ year: 2050 });
      assert.ok(isOk(await repo.save(p3, [e3])));

      const years = await repo.listYears();
      assert.ok(isOk(years));
      assert.deepEqual(
        years.value.filter((y) => y === 2050 || y === 2048),
        [2048, 2050],
      );
    });

    it('save por id existente faz upsert do plano (substitui budgets)', async () => {
      const { plan, event } = createPlan({ year: 2060 });
      assert.ok(isOk(await repo.save(plan, [event])));

      const moneyR = Money.fromCents(50_000);
      assert.ok(isOk(moneyR));
      const municipalityRef = PartnerMunicipalityRef.rehydrate('2304400');
      assert.ok(isOk(municipalityRef));
      const withBudget = BudgetPlan.addBudget(
        plan,
        {
          id: BudgetId.generate(),
          partner: { kind: 'municipality', ref: municipalityRef.value },
          value: moneyR.value,
        },
        NOW,
      );
      assert.ok(isOk(withBudget));
      assert.ok(isOk(await repo.save(withBudget.value.plan, [])));

      const found = await repo.findById(plan.id);
      assert.ok(isOk(found));
      assert.ok(found.value !== null);
      assert.equal(found.value.budgets.length, 1);
      assert.equal(found.value.budgets[0]?.partner.kind, 'municipality');

      const all = await repo.listPaged({ page: 1, limit: 50 });
      assert.ok(isOk(all));
      assert.equal(all.value.items.filter((i) => String(i.id) === String(plan.id)).length, 1);
    });
  });
};
