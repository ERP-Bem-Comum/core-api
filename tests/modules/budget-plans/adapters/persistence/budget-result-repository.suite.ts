// BDG-BUDGET-CALC (#317) — suíte parametrizada do BudgetResultRepository. Roda contra o adapter
// in-memory e o Drizzle/MySQL (paridade de comportamento). Verifica round-trip (add+list), isolamento
// por orçamento (CA3) e delete por orçamento (CA4). Backend-agnóstica.
import { describe, it, beforeEach, afterEach } from 'node:test';
import { strict as assert } from 'node:assert';

import { isOk } from '#src/shared/primitives/result.ts';
import * as BudgetIdMod from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import type { BudgetId } from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import type { CalcModelInput } from '#src/modules/budget-plans/domain/budget-result/calc-model.ts';
import type { LaunchType } from '#src/modules/budget-plans/domain/cost-structure/launch-type.ts';
import type { BudgetResultRepository } from '#src/modules/budget-plans/domain/budget-result/repository.ts';

export interface BudgetResultRepoFactory {
  make: () => Promise<{ repo: BudgetResultRepository; teardown?: () => Promise<void> }>;
}

const IPCA_INPUT: CalcModelInput = { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 }; // -> 104500

const makeResult = (budgetId: BudgetId, launchType: LaunchType, input: CalcModelInput) => {
  const r = BudgetResult.create({
    id: BudgetResultId.generate(),
    budgetId,
    subcategoryId: SubcategoryId.generate(),
    input,
    subcategoryLaunchType: launchType,
  });
  assert.ok(isOk(r));
  return r.value;
};

export const runBudgetResultRepositoryContract = (
  label: string,
  factory: BudgetResultRepoFactory,
): void => {
  describe(`BudgetResultRepository contract — ${label}`, () => {
    let repo: BudgetResultRepository;
    let teardown: (() => Promise<void>) | undefined;

    beforeEach(async () => {
      const built = await factory.make();
      repo = built.repo;
      teardown = built.teardown;
    });

    afterEach(async () => {
      if (teardown) await teardown();
    });

    it('add + listByBudgetId: round-trip preserva value cents e model', async () => {
      const budgetId = BudgetIdMod.generate();
      const res = makeResult(budgetId, 'IPCA', IPCA_INPUT);
      assert.ok(isOk(await repo.add(res)));

      const list = await repo.listByBudgetId(budgetId);
      assert.ok(isOk(list));
      assert.equal(list.value.length, 1);
      assert.equal(String(list.value[0]?.id), String(res.id));
      assert.equal(list.value[0]?.model, 'IPCA');
      assert.equal(list.value[0]?.value.cents, 104500);
    });

    it('CA3: listByBudgetId isola por orçamento', async () => {
      const b1 = BudgetIdMod.generate();
      const b2 = BudgetIdMod.generate();
      assert.ok(isOk(await repo.add(makeResult(b1, 'IPCA', IPCA_INPUT))));
      assert.ok(
        isOk(
          await repo.add(
            makeResult(b2, 'CAED', {
              kind: 'CAED',
              numberOfEnrollments: 30,
              baseValueInCents: 5000,
            }),
          ),
        ),
      );

      const l1 = await repo.listByBudgetId(b1);
      assert.ok(isOk(l1));
      assert.equal(l1.value.length, 1);
      assert.equal(l1.value[0]?.model, 'IPCA');
    });

    it('CA4: deleteByBudgetId remove só os resultados do orçamento alvo', async () => {
      const b1 = BudgetIdMod.generate();
      const b2 = BudgetIdMod.generate();
      assert.ok(isOk(await repo.add(makeResult(b1, 'IPCA', IPCA_INPUT))));
      assert.ok(isOk(await repo.add(makeResult(b2, 'IPCA', IPCA_INPUT))));

      assert.ok(isOk(await repo.deleteByBudgetId(b1)));

      const l1 = await repo.listByBudgetId(b1);
      assert.ok(isOk(l1));
      assert.equal(l1.value.length, 0);
      const l2 = await repo.listByBudgetId(b2);
      assert.ok(isOk(l2));
      assert.equal(l2.value.length, 1);
    });

    it('listByBudgetId sem resultados -> lista vazia', async () => {
      const list = await repo.listByBudgetId(BudgetIdMod.generate());
      assert.ok(isOk(list));
      assert.equal(list.value.length, 0);
    });
  });
};
