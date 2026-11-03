// Achado 8 — criar um plano enquanto outro é importado: sob o REPEATABLE READ default, o
// `SELECT ... FOR UPDATE` num id que ainda não existe (o upsert usado na criação e na cópia) era gap
// lock no PK, e as duas transações travavam uma à outra (deadlock medido em 0,7%).
//
// O critério é a PROPRIEDADE, não o sintoma: (1) nenhuma das duas operações falha (deadlock, timeout)
// e (2) a criação concorrente não espera além do commit da importação. Esperar o commit é
// deliberado: é a verificação de duplicata da UNIQUE (ano, programa, versão), a regra "um plano raiz
// por ano e programa" — medido em `performance_schema.data_lock_waits`, todas as esperas restantes
// estão nesse índice. O número de esperas vai para a medição como informação.
//
// Natural: A importa ~1.020 lançamentos; B cria um plano de outro programa, do mesmo ano, chegando
// num instante sorteado dentro da duração típica de A. A tabela tem 10 planos de fundo.
// GATE: MYSQL_INTEGRATION=1.
import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import { sql } from 'drizzle-orm';
import { setTimeout as sleep } from 'node:timers/promises';
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
  PROGRAM_PARC,
  type Repos,
  type UseCases,
} from './_world.ts';

// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
const lockWaits = async (h: BudgetPlansMysqlHandle): Promise<number> => {
  const [rows] = (await h.db.execute(
    sql`SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_waits'`,
  )) as unknown as [{ Value: string }[]];
  return Number(rows[0]?.Value ?? 0);
};

const removeYear = async (repos: Repos, year: number): Promise<void> => {
  const page = must(await repos.planRepo.listPaged({ page: 1, limit: 100, year }), 'list');
  for (const p of page.items) must(await repos.planRepo.remove(p.id), 'remove');
};

type PairOutcome = Readonly<{ failed: boolean; waitedPastCommit: boolean; key: string }>;

// Dispara A (importação) e B (criação simples, depois de `delay` ms) e mede o fim de cada um.
const runPair = async (
  uc: UseCases,
  year: number,
  delay: number,
  slackMs: number,
): Promise<PairOutcome> => {
  let aEnd = 0;
  let bEnd = 0;
  const [a, b] = await Promise.all([
    uc
      .createBudgetPlan({
        year,
        programRef: PROGRAM_ETI,
        importFromYear: 2025,
        updatedByRef: ACTOR_REF,
      })
      .then((r) => {
        aEnd = performance.now();
        return r;
      }),
    (async () => {
      await sleep(delay);
      const r = await uc.createBudgetPlan({
        year,
        programRef: PROGRAM_PARC,
        updatedByRef: ACTOR_REF,
      });
      bEnd = performance.now();
      return r;
    })(),
  ]);
  const failed = !a.ok || !b.ok;
  // B só pode terminar depois de A pelo tempo do próprio trabalho (com folga). Mais que isso é B
  // esperando ALÉM do commit de A — o que um gap lock preso por outra transação faria.
  const waitedPastCommit = bEnd > aEnd + slackMs;
  return {
    failed,
    waitedPastCommit,
    key: `A=${a.ok ? 'ok' : a.error} B=${b.ok ? 'ok' : b.error} alemDoCommit=${String(waitedPastCommit)}`,
  };
};

if (mysqlEnabled()) {
  let handle: BudgetPlansMysqlHandle | null = null;
  let typicalImportMs = 0;
  let typicalCreateMs = 0;

  before(async () => {
    const r = await openBudgetPlansMysql({
      connectionString: mysqlTestConnectionString(),
      applyMigrations: true,
    });
    if (!r.ok) throw new Error(`fixture: ${r.error}`);
    handle = r.value;
    await truncateBudgetPlans(handle);
    const uc = useCases(mysqlRepos(handle));
    for (let y = 2010; y < 2020; y += 1) {
      must(
        await uc.createBudgetPlan({ year: y, programRef: PROGRAM_PARC, updatedByRef: ACTOR_REF }),
        'fundo',
      );
    }
    // origem: 5 redes × 17 subcategorias × 12 meses = 1.020 lançamentos
    await seedPlan(uc, {
      year: 2025,
      programRef: PROGRAM_ETI,
      budgets: 5,
      subcategories: 17,
      months: 12,
      approve: true,
    });
    // Durações de referência SEM concorrência.
    let t0 = performance.now();
    must(
      await uc.createBudgetPlan({
        year: 2026,
        programRef: PROGRAM_ETI,
        importFromYear: 2025,
        updatedByRef: ACTOR_REF,
      }),
      'referência importação',
    );
    typicalImportMs = performance.now() - t0;
    t0 = performance.now();
    must(
      await uc.createBudgetPlan({ year: 2026, programRef: PROGRAM_PARC, updatedByRef: ACTOR_REF }),
      'referência criação',
    );
    typicalCreateMs = performance.now() - t0;
    await removeYear(mysqlRepos(handle), 2026);
  });
  after(async () => {
    if (handle !== null) await handle.close();
  });

  const scenario =
    (id: string, label: string, yearOf: (i: number) => number): (() => Promise<void>) =>
    async () => {
      const outcomes: Record<string, number> = {};
      let lockWaitsTotal = 0;
      const m = await measure(
        id,
        label,
        async (i) => {
          if (handle === null) throw new Error('handle');
          const repos = mysqlRepos(handle);
          const year = yearOf(i);
          await removeYear(repos, year);
          const waitsBefore = await lockWaits(handle);
          // Folga: 3× a criação sem concorrência + 20 ms de agenda do event loop.
          const out = await runPair(
            useCases(repos),
            year,
            Math.random() * typicalImportMs,
            3 * typicalCreateMs + 20,
          );
          lockWaitsTotal += (await lockWaits(handle)) - waitsBefore;
          outcomes[out.key] = (outcomes[out.key] ?? 0) + 1;
          return out.failed || out.waitedPastCommit;
        },
        () => ({
          typicalImportMs: Math.round(typicalImportMs),
          typicalCreateMs: Math.round(typicalCreateMs),
          lockWaitsInformativo: lockWaitsTotal,
          outcomes,
        }),
      );
      assert.equal(m.occurred, 0, `falha ou espera além do commit em ${m.occurred}/${m.runs}`);
    };

  describe('F8 — criar plano durante uma importação', () => {
    it(
      'nunca falha e nunca espera além do commit da importação',
      scenario('F8', 'mesmo ano (2026) recriado a cada execução', () => 2026),
    );

    // Cada execução usa um ano novo (ciclo de 70): sem registro marcado como apagado no índice.
    it(
      'idem com chaves novas a cada execução',
      scenario('F8-chaves-novas', 'ano novo a cada execução', (i) => 2030 + (i % 70)),
    );
  });
}
