// Achado 8 — criar um plano enquanto outro é importado: sob o REPEATABLE READ default, o
// `SELECT ... FOR UPDATE` num id que ainda não existe (o upsert usado na criação e na cópia) era gap
// lock no PK, e as duas transações travavam uma à outra (deadlock medido em 0,7%).
//
// Critério: os contadores OBJETIVOS do risco — (1) nenhuma das duas operações falha e (2) o InnoDB
// não registra deadlock (`INNODB_METRICS.lock_deadlocks`). O retry de deadlock do `create`/cópia
// esconderia um deadlock da resposta; o contador do servidor, não.
//
// Por que NÃO é critério de tempo: a versão anterior reprovava se B terminasse mais de X ms depois
// do commit de A. Numa VM de MySQL isso oscilou de 1 a 21 em 1000 com a MESMA folga, sempre num
// atraso de ~35–50 ms — e um diagnóstico de 500 pares mostrou 0 deadlock nesses casos. A causa do
// atraso não foi identificada; ela fica registrada como informação (`atrasosDepoisDoCommitMs`), em
// vez de virar critério instável.
//
// Esperar o commit de A é deliberado: é a verificação de duplicata da UNIQUE (ano, programa, versão),
// a regra "um plano raiz por ano e programa" (medido em `performance_schema.data_lock_waits`).
//
// Natural: A importa ~1.020 lançamentos; B cria um plano de outro programa, do mesmo ano, chegando
// num instante sorteado dentro da duração típica de A. A tabela tem 10 planos de fundo.
// GATE: MYSQL_INTEGRATION=1.
import { describe, it, beforeAll, afterAll } from 'bun:test';
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
} from './_world.ts';

const counter = async (
  // eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
  h: BudgetPlansMysqlHandle,
  query: ReturnType<typeof sql>,
): Promise<number> => {
  const [rows] = (await h.db.execute(query)) as unknown as [{ n: number | string }[]];
  return Number(rows[0]?.n ?? 0);
};

const DEADLOCKS = sql`SELECT COUNT AS n FROM information_schema.INNODB_METRICS WHERE NAME = 'lock_deadlocks'`;
const LOCK_WAITS = sql`SELECT VARIABLE_VALUE AS n FROM performance_schema.global_status WHERE VARIABLE_NAME = 'Innodb_row_lock_waits'`;

const removeYear = async (repos: Repos, year: number): Promise<void> => {
  const page = must(await repos.planRepo.listPaged({ page: 1, limit: 100, year }), 'list');
  for (const p of page.items) must(await repos.planRepo.remove(p.id), 'remove');
};

if (mysqlEnabled()) {
  let handle: BudgetPlansMysqlHandle | null = null;
  let typicalImportMs = 0;

  beforeAll(async () => {
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
    // Duração de referência da importação SEM concorrência (para sortear a chegada de B).
    const t0 = performance.now();
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
    await removeYear(mysqlRepos(handle), 2026);
  });
  afterAll(async () => {
    if (handle !== null) await handle.close();
  });

  const scenario =
    (id: string, label: string, yearOf: (i: number) => number): (() => Promise<void>) =>
    async () => {
      const outcomes: Record<string, number> = {};
      const lateMs: number[] = [];
      let deadlocksTotal = 0;
      let lockWaitsTotal = 0;
      const m = await measure(
        id,
        label,
        async (i) => {
          if (handle === null) throw new Error('handle');
          const h = handle;
          const repos = mysqlRepos(h);
          const year = yearOf(i);
          await removeYear(repos, year);
          const uc = useCases(repos);
          const deadlocksBefore = await counter(h, DEADLOCKS);
          const waitsBefore = await counter(h, LOCK_WAITS);
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
              .then((res) => {
                aEnd = performance.now();
                return res;
              }),
            (async () => {
              await sleep(Math.random() * typicalImportMs);
              const res = await uc.createBudgetPlan({
                year,
                programRef: PROGRAM_PARC,
                updatedByRef: ACTOR_REF,
              });
              bEnd = performance.now();
              return res;
            })(),
          ]);
          const deadlocks = (await counter(h, DEADLOCKS)) - deadlocksBefore;
          deadlocksTotal += deadlocks;
          lockWaitsTotal += (await counter(h, LOCK_WAITS)) - waitsBefore;
          // Informativo: B terminando mais de 30 ms depois de A (o atraso não explicado).
          if (bEnd - aEnd > 30) lateMs.push(Math.round(bEnd - aEnd));
          const failed = !a.ok || !b.ok;
          const key = `A=${a.ok ? 'ok' : a.error} B=${b.ok ? 'ok' : b.error} deadlock=${String(deadlocks > 0)}`;
          outcomes[key] = (outcomes[key] ?? 0) + 1;
          return failed || deadlocks > 0;
        },
        () => ({
          typicalImportMs: Math.round(typicalImportMs),
          deadlocks: deadlocksTotal,
          lockWaitsInformativo: lockWaitsTotal,
          atrasosDepoisDoCommitMs: lateMs,
          outcomes,
        }),
      );
      assert.equal(m.occurred, 0, `falha ou deadlock em ${m.occurred}/${m.runs}`);
    };

  describe('F8 — criar plano durante uma importação', () => {
    it(
      'nunca falha e nunca causa deadlock',
      scenario('F8', 'mesmo ano (2026) recriado a cada execução', () => 2026),
    );

    // Cada execução usa um ano novo (ciclo de 70): sem registro marcado como apagado no índice.
    it(
      'idem com chaves novas a cada execução',
      scenario('F8-chaves-novas', 'ano novo a cada execução', (i) => 2030 + (i % 70)),
    );
  });
}
