// Achado 3 — dois POST simultâneos para o mesmo ano + programa: o perdedor deveria receber 409
// `budget-plan-already-exists`, e o achado diz que recebe 503 `plan-clone-write-unavailable`.
// Mede também o mesmo par SEM importação, para separar o que é herdado do que é novo.
// GATE: MYSQL_INTEGRATION=1.
import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';
import {
  mysqlEnabled,
  mysqlRepos,
  useCases,
  seedPlan,
  measure,
  must,
  truncateBudgetPlans,
  ACTOR_REF,
  PROGRAM_ETI,
  type Repos,
} from './_world.ts';

// Apaga os planos de 2026 (o par do teste) e mantém a origem de 2025.
const remove2026 = async (repos: Repos): Promise<void> => {
  const page = must(
    await repos.planRepo.listPaged({ page: 1, limit: 100, year: 2026 }),
    'listPaged',
  );
  for (const p of page.items) must(await repos.planRepo.remove(p.id), 'remove');
};

const classify = (
  rs: readonly Readonly<{ ok: boolean; error?: unknown }>[],
  outcomes: Record<string, number>,
): void => {
  const key = rs
    .map((r) => (r.ok ? 'ok' : String(r.error)))
    .toSorted((a, b) => a.localeCompare(b))
    .join(' + ');
  outcomes[key] = (outcomes[key] ?? 0) + 1;
};

if (mysqlEnabled()) {
  let handle: BudgetPlansMysqlHandle | null = null;
  before(async () => {
    const r = await openBudgetPlansMysql({
      connectionString: mysqlTestConnectionString(),
      applyMigrations: true,
    });
    if (!r.ok) throw new Error(`fixture: ${r.error}`);
    handle = r.value;
    await truncateBudgetPlans(handle);
    // origem: 2025 aprovado, 3 redes × 5 subcategorias × 12 meses = 180 lançamentos
    await seedPlan(useCases(mysqlRepos(handle)), {
      year: 2025,
      programRef: PROGRAM_ETI,
      budgets: 3,
      subcategories: 5,
      months: 12,
      approve: true,
    });
  });
  after(async () => {
    if (handle !== null) await handle.close();
  });

  describe('F3 — corrida de criação do mesmo ano + programa', () => {
    it('com importação: o perdedor recebe 409, nunca 503', async () => {
      const outcomes: Record<string, number> = {};
      const m = await measure(
        'F3-import',
        '2 importações simultâneas para 2026; perdedor recebe plan-clone-write-unavailable',
        async () => {
          if (handle === null) throw new Error('handle');
          const repos = mysqlRepos(handle);
          await remove2026(repos);
          const uc = useCases(repos);
          const cmd = {
            year: 2026,
            programRef: PROGRAM_ETI,
            importFromYear: 2025,
            updatedByRef: ACTOR_REF,
          };
          const rs = await Promise.all([uc.createBudgetPlan(cmd), uc.createBudgetPlan(cmd)]);
          classify(rs, outcomes);
          return rs.some((r) => !r.ok && r.error === 'plan-clone-write-unavailable');
        },
        () => ({ outcomes }),
      );
      assert.equal(m.occurred, 0, `503 em ${m.occurred}/${m.runs}`);
    });

    it('sem importação (comportamento anterior ao PR): o perdedor recebe 409, nunca 503', async () => {
      const outcomes: Record<string, number> = {};
      const m = await measure(
        'F3-sem-import',
        '2 criações simples simultâneas para 2026; perdedor recebe budget-plan-repo-unavailable',
        async () => {
          if (handle === null) throw new Error('handle');
          const repos = mysqlRepos(handle);
          await remove2026(repos);
          const uc = useCases(repos);
          const cmd = { year: 2026, programRef: PROGRAM_ETI, updatedByRef: ACTOR_REF };
          const rs = await Promise.all([uc.createBudgetPlan(cmd), uc.createBudgetPlan(cmd)]);
          classify(rs, outcomes);
          return rs.some((r) => !r.ok && r.error === 'budget-plan-repo-unavailable');
        },
        () => ({ outcomes }),
      );
      // Sem o ramo de importação o resultado também tem de ser 409.
      assert.equal(m.occurred, 0, `503 em ${m.occurred}/${m.runs}`);
    });
  });
}
