// BGP-DELETE-BUDGET-ATOMIC (#377) — W0 RED — atomicidade de `removeBudget` (Drizzle + MySQL real).
//
// `BudgetPlanRepository.removeBudget(planSemBudget, budgetId, events)` faz upsert do plano +
// delete dos bgp_budget_results daquele budget na MESMA db.transaction (molde do `save`, ADR-0015).
//   - Caminho feliz  -> budget e results somem juntos.
//   - Rollback       -> um passo falha DENTRO da tx (evento malformado: event_type vazio rejeitado
//                       pelo CHECK bgp_outbox_event_type_nonempty_chk) -> NADA persiste (budget
//                       continua no plano E os results continuam) — sem orfaos, sem remocao parcial.
//
// DEVE FALHAR em W0: `removeBudget` ainda nao existe no BudgetPlanRepository/adapter drizzle.
// GATE: MYSQL_INTEGRATION=1 (registrado no runner, suite budget-plans). Skip limpo sem o env
// (so o teste estrutural roda no `pnpm test` puro).

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { isNotNull } from 'drizzle-orm';

import { isOk } from '#src/shared/index.ts';
import * as Money from '#src/shared/kernel/money.ts';
import * as UserRef from '#src/shared/kernel/user-ref.ts';
import * as BudgetId from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import * as ExerciseMonth from '#src/modules/budget-plans/domain/shared/exercise-month.ts';
import * as SubcategoryId from '#src/modules/budget-plans/domain/cost-structure/subcategory-id.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import * as BudgetPlanId from '#src/modules/budget-plans/domain/shared/budget-plan-id.ts';
import { ProgramRef, PartnerStateRef } from '#src/modules/budget-plans/domain/shared/refs.ts';
import { BudgetPlan } from '#src/modules/budget-plans/domain/budget-plan/budget-plan.ts';
import type { BudgetPlan as BudgetPlanEntity } from '#src/modules/budget-plans/domain/budget-plan/types.ts';
import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import type { BudgetPlansModuleEvent } from '#src/modules/budget-plans/public-api/events.ts';
import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.drizzle.ts';
import { createDrizzleBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.drizzle.ts';

// #413 — mês do exercício nas fixtures (o VO tem suíte própria; aqui mês inválido é erro de teste).
const FIXTURE_MONTH = (() => {
  const m = ExerciseMonth.parse(1);
  if (!m.ok) throw new Error('fixture inválida: mês');
  return m.value;
})();

const VALID_CONN = 'mysql://root:rootpw-migration-test-only@127.0.0.1:3306/core';

const integrationEnabled = (): boolean => process.env.MYSQL_INTEGRATION === '1';

const NOW = new Date('2026-07-14T12:00:00.000Z');
const ACTOR = (() => {
  const r = UserRef.rehydrate('00000000-0000-4000-8000-000000000001');
  if (!r.ok) throw new Error('setup: actor');
  return r.value;
})();

// Estrutural — sempre roda (mesmo sem DB).
describe('removeBudget atomic — shape', () => {
  it('createDrizzleBudgetPlanRepository e createDrizzleBudgetResultRepository sao funcoes', () => {
    assert.equal(typeof createDrizzleBudgetPlanRepository, 'function');
    assert.equal(typeof createDrizzleBudgetResultRepository, 'function');
  });
});

if (integrationEnabled()) {
  let handle: BudgetPlansMysqlHandle | null = null;

  before(async () => {
    const r = await openBudgetPlansMysql({ connectionString: VALID_CONN, applyMigrations: true });
    if (!r.ok) throw new Error(`fixture: openBudgetPlansMysql falhou — ${r.error}`);
    handle = r.value;
  });

  after(async () => {
    if (handle !== null) {
      await handle.close();
      handle = null;
    }
  });

  const truncate = async (h: BudgetPlansMysqlHandle): Promise<void> => {
    await h.db.delete(h.schema.bgpOutbox);
    await h.db.delete(h.schema.budgetResults);
    await h.db.delete(h.schema.budgets);
    // FK auto-referente parent_id: filhos antes dos pais.
    await h.db.delete(h.schema.budgetPlans).where(isNotNull(h.schema.budgetPlans.parentId));
    await h.db.delete(h.schema.budgetPlans);
  };

  // Semeia 1 plano com 1 orcamento (persistido) + 1 resultado dependente. Devolve os repos, os ids e o
  // plano-sem-o-budget (o que o use-case entrega ao removeBudget) e o plano-com-o-budget.
  const seed = async (h: BudgetPlansMysqlHandle) => {
    const planRepo = createDrizzleBudgetPlanRepository(h);
    const resultRepo = createDrizzleBudgetResultRepository(h);

    const planId = BudgetPlanId.generate();
    const programRef = ProgramRef.rehydrate('22222222-2222-4222-8222-222222222222');
    assert.ok(isOk(programRef));
    const created = BudgetPlan.create({
      id: planId,
      year: 2026,
      programRef: programRef.value,
      now: NOW,
      actor: ACTOR,
    });
    assert.ok(isOk(created));
    const stateRef = PartnerStateRef.rehydrate('CE');
    assert.ok(isOk(stateRef));
    const money = Money.fromCents(500000);
    assert.ok(isOk(money));
    const budgetId = BudgetId.generate();
    const withBudget = BudgetPlan.addBudget(
      created.value.plan,
      { id: budgetId, partner: { kind: 'state', ref: stateRef.value } },
      NOW,
      ACTOR,
    );
    assert.ok(isOk(withBudget));
    const planWithBudget: BudgetPlanEntity = withBudget.value.plan;
    assert.ok(isOk(await planRepo.save(planWithBudget, [])));

    const resultR = BudgetResult.create({
      id: BudgetResultId.generate(),
      budgetId,
      subcategoryId: SubcategoryId.generate(),
      month: FIXTURE_MONTH,
      input: { kind: 'IPCA', baseValueInCents: 100000, ipca: 4.5 },
      subcategoryLaunchType: 'IPCA',
    });
    assert.ok(isOk(resultR));
    assert.ok(isOk(await resultRepo.save(resultR.value)));

    const removed = BudgetPlan.removeBudget(planWithBudget, budgetId, NOW, ACTOR);
    assert.ok(isOk(removed));

    return {
      planRepo,
      resultRepo,
      planId,
      budgetId,
      planWithBudget,
      planWithoutBudget: removed.value.plan,
    };
  };

  describe('#377 removeBudget atomico (Drizzle + MySQL)', () => {
    it('CA4 caminho feliz: budget e results somem juntos (mesma tx)', async () => {
      assert.ok(handle !== null);
      await truncate(handle);
      const { planRepo, resultRepo, planId, budgetId, planWithoutBudget } = await seed(handle);

      const r = await planRepo.removeBudget(planWithoutBudget, budgetId, []);
      assert.ok(isOk(r));

      const found = await planRepo.findById(planId);
      assert.ok(isOk(found));
      assert.equal(found.value?.budgets.length, 0, 'budget removido do plano');

      const list = await resultRepo.listByBudgetId(budgetId);
      assert.ok(isOk(list));
      assert.equal(list.value.length, 0, 'results do budget apagados juntos');
    });

    it('CA1/CA4 rollback: passo falha na tx -> NADA persiste (budget e results permanecem)', async () => {
      assert.ok(handle !== null);
      await truncate(handle);
      const { planRepo, resultRepo, planId, budgetId, planWithBudget, planWithoutBudget } =
        await seed(handle);

      // Evento malformado (event_type vazio) -> CHECK bgp_outbox_event_type_nonempty_chk rejeita o
      // INSERT do outbox DENTRO da tx -> a tx inteira reverte (upsert do plano + delete dos results).
      const badEvent = {
        type: '',
        budgetPlanId: planWithBudget.id,
        year: planWithBudget.year,
        programRef: planWithBudget.programRef,
        occurredAt: NOW,
      } as unknown as BudgetPlansModuleEvent;

      const r = await planRepo.removeBudget(planWithoutBudget, budgetId, [badEvent]);
      assert.equal(r.ok, false, 'removeBudget falha (outbox rejeitado dentro da tx)');

      const found = await planRepo.findById(planId);
      assert.ok(isOk(found));
      assert.equal(found.value?.budgets.length, 1, 'budget continua no plano (rollback)');
      assert.equal(String(found.value?.budgets[0]?.id), String(budgetId));

      const list = await resultRepo.listByBudgetId(budgetId);
      assert.ok(isOk(list));
      assert.equal(
        list.value.length,
        1,
        'results continuam (rollback) — sem orfaos, sem remocao parcial',
      );
    });
  });
}
