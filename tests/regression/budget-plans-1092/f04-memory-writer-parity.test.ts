// Achado 4 — o writer in-memory não tem a semântica do MySQL.
//   (a) Duas linhas com a mesma chave (budget × subcategoria × mês): o MySQL recusa (INSERT puro +
//       UNIQUE, provado em plan-clone-writer.drizzle-mysql.test.ts); o in-memory aceita.
//   (b) Falha no meio da gravação: o MySQL faz rollback; o in-memory deixa o plano gravado.
// Ocorrência = o in-memory diverge do MySQL.
import { describe, it } from 'bun:test';
import { strict as assert } from 'node:assert';
import { err } from '#src/shared/primitives/result.ts';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import type { BudgetResultRepository } from '#src/modules/budget-plans/domain/budget-result/repository.ts';
import { InMemoryBudgetPlanRepository } from '#src/modules/budget-plans/adapters/persistence/repos/budget-plan-repository.in-memory.ts';
import { InMemoryPlanCloneWriter } from '#src/modules/budget-plans/adapters/persistence/repos/plan-clone-writer.in-memory.ts';
import { memoryRepos, measure, buildCloneContent } from './_world.ts';

describe('F4 — paridade do writer in-memory com o MySQL', () => {
  it('(a) chave de lançamento duplicada é recusada, como no MySQL', async () => {
    const m = await measure('F4a', 'in-memory aceita 2 lançamentos de mesma chave', async () => {
      const repos = memoryRepos();
      const c = buildCloneContent(1);
      const dup = { ...c.results[0]!, id: BudgetResultId.generate() };
      const written = await repos.planCloneWriter.write({ ...c, results: [...c.results, dup] });
      return written.ok;
    });
    assert.equal(m.occurred, 0, `in-memory aceitou duplicata em ${m.occurred}/${m.runs}`);
  });

  it('(b) falha no meio não deixa plano nem lançamento gravado, como no MySQL', async () => {
    const m = await measure(
      'F4b',
      'falha no 2º lançamento deixa plano ou lançamento no store',
      async () => {
        // Repositório de planos montado SEM o de lançamentos (como o `_support.ts` dos testes): o
        // `remove` do plano não leva os lançamentos, e o desfazer do writer tem de levá-los sozinho.
        const base = memoryRepos();
        const repos = { ...base, planRepo: InMemoryBudgetPlanRepository().repo };
        let calls = 0;
        const failing: BudgetResultRepository = {
          ...repos.budgetResultRepo,
          save: async (r) => {
            calls += 1;
            return calls === 2
              ? err('budget-result-repo-unavailable' as const)
              : repos.budgetResultRepo.save(r);
          },
        };
        const writer = InMemoryPlanCloneWriter({
          planRepo: repos.planRepo,
          costStructureRepo: repos.costStructureRepo,
          budgetResultRepo: failing,
        });
        const c = buildCloneContent(2);
        const written = await writer.write(c);
        assert.ok(!written.ok);
        // Parcial = sobrou o plano OU sobrou algum lançamento das redes dele.
        const found = await repos.planRepo.findById(c.plan.id);
        const leftovers = await repos.budgetResultRepo.listByBudgetIds(
          c.plan.budgets.map((b) => b.id),
        );
        return (found.ok && found.value !== null) || (leftovers.ok && leftovers.value.length > 0);
      },
    );
    assert.equal(m.occurred, 0, `plano parcial em ${m.occurred}/${m.runs}`);
  });
});
