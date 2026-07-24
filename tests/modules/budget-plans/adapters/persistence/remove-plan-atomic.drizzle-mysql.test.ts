// BGP-PLAN-DELETE (#453) — W0 RED — CA2: `BudgetPlanRepository.remove(plan)` contra MySQL real.
//
// Por que este teste é o coração do ticket: o schema NÃO apaga tudo sozinho.
//
//   bgp_budget_plans (parent_id → self, RESTRICT)
//   ├── bgp_budgets        (→ plan, CASCADE)   ✔ o banco cuida
//   ├── bgp_cost_centers   (→ plan, CASCADE) → categories → subcategories  ✔ o banco cuida
//   └── bgp_budget_results (budget_id, subcategory_id — SEM FK NENHUMA)    ✘ ORFANA
//
// `bgp_budget_results` não tem FK (decisão do #377: o pai sofre replace-all). Logo um `DELETE` do
// plano cascateia os budgets e deixa os resultados apontando para um budget que não existe mais —
// lixo invisível que ainda soma no total por Rede. O delete dos results tem que ser explícito e na
// MESMA transação, senão trocamos "não dá pra excluir" por "excluir corrompe".
//
// O RESTRICT do parent_id é o backstop de D2 (plano com filhos não some), mas quem devolve 409
// limpo é a guarda de domínio — o erro de FK viraria 500.
//
// GATE: MYSQL_INTEGRATION=1. Skip limpo sem o env (só o teste estrutural roda no `pnpm test` puro).
// RED esperado: `remove` ainda não existe no BudgetPlanRepository/adapter drizzle.

import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import { isNotNull, eq } from 'drizzle-orm';

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
import * as BudgetResult from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzleBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.drizzle.ts';
import { createDrizzleBudgetResultRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-result-repository.drizzle.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';

const VALID_CONN = process.env['BUDGET_PLANS_DATABASE_URL'] ?? mysqlTestConnectionString();

const integrationEnabled = (): boolean => process.env['MYSQL_INTEGRATION'] === '1';

const NOW = new Date('2026-07-15T12:00:00.000Z');
const ACTOR = (() => {
  const r = UserRef.rehydrate('00000000-0000-4000-8000-000000000001');
  if (!r.ok) throw new Error('setup: actor');
  return r.value;
})();
const FIXTURE_MONTH = (() => {
  const m = ExerciseMonth.parse(1);
  if (!m.ok) throw new Error('fixture inválida: mês');
  return m.value;
})();

// Estrutural — sempre roda (mesmo sem DB).
describe('remove plan atomic — shape', () => {
  it('createDrizzleBudgetPlanRepository é função', () => {
    assert.equal(typeof createDrizzleBudgetPlanRepository, 'function');
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
    await h.db.delete(h.schema.subcategories);
    await h.db.delete(h.schema.categories);
    await h.db.delete(h.schema.costCenters);
    // FK auto-referente parent_id: filhos antes dos pais.
    await h.db.delete(h.schema.budgetPlans).where(isNotNull(h.schema.budgetPlans.parentId));
    await h.db.delete(h.schema.budgetPlans);
  };

  // 1 plano RASCUNHO + 1 orçamento + 1 resultado dependente (o que precisa sumir junto).
  // `year` é parâmetro porque dois seeds na mesma suíte colidiriam na UNIQUE
  // (year, program_ref, version_major, version_minor).
  const seed = async (h: BudgetPlansMysqlHandle, year = 2026) => {
    const planRepo = createDrizzleBudgetPlanRepository(h);
    const resultRepo = createDrizzleBudgetResultRepository(h);

    const planId = BudgetPlanId.generate();
    const programRef = ProgramRef.rehydrate('33333333-3333-4333-8333-333333333333');
    assert.ok(isOk(programRef));
    const created = BudgetPlan.create({
      id: planId,
      year,
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
    assert.ok(isOk(await planRepo.save(withBudget.value.plan, [])));

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

    return { planRepo, resultRepo, planId, budgetId, plan: withBudget.value.plan };
  };

  const countResults = async (h: BudgetPlansMysqlHandle, budgetId: string): Promise<number> => {
    const rows = await h.db
      .select({ id: h.schema.budgetResults.id })
      .from(h.schema.budgetResults)
      .where(eq(h.schema.budgetResults.budgetId, budgetId));
    return rows.length;
  };

  const countBudgets = async (h: BudgetPlansMysqlHandle, planId: string): Promise<number> => {
    const rows = await h.db
      .select({ id: h.schema.budgets.id })
      .from(h.schema.budgets)
      .where(eq(h.schema.budgets.budgetPlanId, planId));
    return rows.length;
  };

  describe('#453 remove plan atômico (Drizzle + MySQL)', () => {
    it('CA1/CA2: plano some — e leva orçamentos E resultados junto', async () => {
      assert.ok(handle !== null);
      await truncate(handle);
      const { planRepo, planId, budgetId, plan } = await seed(handle);

      assert.equal(
        await countResults(handle, String(budgetId)),
        1,
        'pré-condição: resultado existe',
      );

      const r = await planRepo.remove(plan.id);
      assert.ok(isOk(r), `esperado ok — ${JSON.stringify(r)}`);

      const found = await planRepo.findById(planId);
      assert.ok(isOk(found));
      assert.equal(found.value, null, 'plano apagado');

      assert.equal(await countBudgets(handle, String(planId)), 0, 'orçamentos apagados (cascade)');

      // O ponto do ticket: sem FK, só some se o delete for explícito. Um resultado sobrevivente
      // aqui é lixo que ainda soma no total por Rede — pior que não ter a rota.
      assert.equal(
        await countResults(handle, String(budgetId)),
        0,
        'resultados apagados — bgp_budget_results não tem FK, some só se o repo apagar',
      );
    });

    // CA2 — a metade que faltava: o caminho feliz não prova ATOMICIDADE. Sem este teste, trocar a
    // transação por dois awaits soltos deixaria os outros casos verdes enquanto corrompe dado.
    //
    // Gatilho: um plano FILHO faz o FK RESTRICT (parent_id) derrubar o DELETE do plano — que roda
    // DEPOIS do delete dos results, dentro da mesma tx. Se há rollback, os results voltam.
    // (O truque do #377 — evento de outbox malformado — não serve aqui: `remove` não recebe events.)
    it('CA2 rollback: o DELETE do plano falha → os results apagados VOLTAM (nada parcial)', async () => {
      assert.ok(handle !== null);
      await truncate(handle);
      const { planRepo, planId, budgetId, plan } = await seed(handle);

      // Filho apontando para o plano: o RESTRICT vai recusar o DELETE do pai.
      const childId = BudgetPlanId.generate();
      const programRef = ProgramRef.rehydrate('33333333-3333-4333-8333-333333333333');
      assert.ok(isOk(programRef));
      const child = BudgetPlan.createScenery(
        plan,
        [],
        { id: childId, name: 'Cenário' },
        {
          now: NOW,
          actor: ACTOR,
        },
      );
      assert.ok(isOk(child));
      assert.ok(isOk(await planRepo.save(child.value.plan, [])));

      assert.equal(await countResults(handle, String(budgetId)), 1, 'pré-condição: result existe');

      const r = await planRepo.remove(planId);
      assert.ok(!r.ok, 'o banco tem que recusar');
      // 409, não 503: retry nunca passaria enquanto o filho existir.
      assert.equal(r.error, 'budget-plan-has-children');

      // O coração: o delete dos results roda ANTES do DELETE que falha. Sem tx, eles teriam sumido.
      assert.equal(
        await countResults(handle, String(budgetId)),
        1,
        'rollback devolveu os results — sem tx, o plano continuaria e os lançamentos teriam sumido',
      );
      const found = await planRepo.findById(planId);
      assert.ok(isOk(found));
      assert.ok(found.value !== null, 'o plano continua de pé');
    });

    it('CA2: apagar um plano NÃO apaga dado de outro plano', async () => {
      assert.ok(handle !== null);
      await truncate(handle);
      const vitima = await seed(handle, 2026);
      const sobrevivente = await seed(handle, 2027);

      assert.ok(isOk(await vitima.planRepo.remove(vitima.plan.id)));

      const found = await sobrevivente.planRepo.findById(sobrevivente.planId);
      assert.ok(isOk(found));
      assert.ok(found.value !== null, 'o outro plano continua de pé');
      assert.equal(await countBudgets(handle, String(sobrevivente.planId)), 1);
      assert.equal(
        await countResults(handle, String(sobrevivente.budgetId)),
        1,
        'o delete dos results é escopado ao plano removido, não global',
      );
    });
  });
}
