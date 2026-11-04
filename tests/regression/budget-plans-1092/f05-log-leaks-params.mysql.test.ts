// Achado 5 — quando o INSERT dos lançamentos falha, o log do writer leva o SQL com os parâmetros
// (ids e valores do plano). Força a falha com 500 lançamentos e a chave repetida DENTRO do primeiro
// lote. Ocorrência = a linha de stderr contém algum parâmetro do plano (o id da rede).
// GATE: MYSQL_INTEGRATION=1.
import { describe, it, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
import process from 'node:process';
import * as BudgetResultId from '#src/modules/budget-plans/domain/budget-result/budget-result-id.ts';
import { openBudgetPlansMysql } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import type { BudgetPlansMysqlHandle } from '#src/modules/budget-plans/adapters/persistence/drivers/mysql-driver.ts';
import { createDrizzlePlanCloneWriter } from '#src/modules/budget-plans/adapters/persistence/repos/plan-clone-writer.drizzle.ts';
import { budgetResultToInsert } from '#src/modules/budget-plans/adapters/persistence/mappers/budget-result.mapper.ts';
import { mysqlTestConnectionString } from '#tests/support/mysql-conn.ts';
import { mysqlEnabled, measure, buildCloneContent, truncateBudgetPlans } from './_world.ts';

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
  });
  after(async () => {
    if (handle !== null) await handle.close();
  });

  describe('F5 — log de falha do writer', () => {
    it('não despeja os parâmetros do plano no stderr', async () => {
      let bytes = 0;
      let failures = 0;
      const m = await measure(
        'F5',
        'falha no 1º lote de 500 lançamentos; stderr contém dado do plano',
        async () => {
          if (handle === null) throw new Error('handle');
          const c = buildCloneContent(499);
          const dup = { ...c.results[0]!, id: BudgetResultId.generate() };
          const captured: string[] = [];
          const original = process.stderr.write.bind(process.stderr);
          process.stderr.write = ((chunk: string | Uint8Array) => {
            captured.push(typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8'));
            return true;
          }) as typeof process.stderr.write;
          let written;
          try {
            written = await createDrizzlePlanCloneWriter(handle).write({
              ...c,
              results: [c.results[0]!, dup, ...c.results.slice(1)],
            });
          } finally {
            process.stderr.write = original;
          }
          assert.ok(!written.ok);
          failures += 1;
          const log = captured.join('');
          bytes += log.length;
          return log.includes(String(c.budgetId));
        },
        () => ({ avgLogBytes: failures === 0 ? 0 : Math.round(bytes / failures) }),
      );
      assert.equal(m.occurred, 0, `vazou em ${m.occurred}/${m.runs}`);
    });

    // Hipótese (a), a que NÃO foi adotada: logar `errno code sqlMessage`. Mede-se sobre o mesmo erro
    // real (duplicate key no lote de lançamentos), formatado do jeito da hipótese.
    it('hipótese (a) — logar a sqlMessage também vazaria', async () => {
      const m = await measure(
        'F5-hipotese-a',
        'linha "errno code sqlMessage" contém dado do plano',
        async () => {
          if (handle === null) throw new Error('handle');
          const c = buildCloneContent(2);
          const dup = { ...c.results[0]!, id: BudgetResultId.generate() };
          let line = '';
          try {
            await handle.db
              .insert(handle.schema.budgetResults)
              .values([c.results[0]!, dup].map(budgetResultToInsert));
          } catch (e) {
            const cause = (e as { cause?: Record<string, unknown> }).cause ?? {};
            line = `errno=${String(cause['errno'])} code=${String(cause['code'])} ${String(cause['sqlMessage'])}`;
          }
          return line.includes(String(c.budgetId));
        },
      );
      // Registra a medição; o resultado esperado da hipótese (a) é VAZAR (por isso não foi adotada).
      assert.ok(m.runs > 0);
    });
  });
}
