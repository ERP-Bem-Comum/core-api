import process from 'node:process';
import { ok, err } from '#src/shared/primitives/result.ts';
import type { PlanCloneWriter } from '#src/modules/budget-plans/application/ports/plan-clone-writer.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';
import { budgetResultToInsert } from '../mappers/budget-result.mapper.ts';
import { upsertPlanInTx } from './budget-plan-repository.drizzle.ts';
import { writeTree } from './cost-structure-repository.drizzle.ts';

// Teto de linhas por INSERT multi-row dos lançamentos. Um plano do legado tem ~1.000 lançamentos
// (4.679 em 5 planos no dump de produção); em lotes, o pacote fica longe do `max_allowed_packet`.
const RESULTS_PER_INSERT = 500;

// #1092 — grava a cópia de um plano numa transação só: cabeçalho + budgets + outbox
// (`upsertPlanInTx`), árvore de custos (`writeTree`) e lançamentos. Qualquer exceção no meio faz o
// Drizzle emitir ROLLBACK, e nada da cópia fica gravado.
//
// Os lançamentos entram por INSERT puro, não pelo upsert do `BudgetResultRepository.save`: o plano é
// novo e todos os ids foram gerados agora, então não existe linha anterior a atualizar. Uma colisão na
// UNIQUE (budget_id, subcategory_id, month) aqui seria defeito da cópia, e o INSERT puro a transforma
// em erro (com rollback) em vez de sobrescrever em silêncio, como o ON DUPLICATE KEY UPDATE faria.
export const createDrizzlePlanCloneWriter = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): PlanCloneWriter => ({
  write: async ({ plan, events, structure, results }) => {
    try {
      await handle.db.transaction(async (tx) => {
        await upsertPlanInTx(tx, plan, events);
        await writeTree(tx, structure);
        const rows = results.map(budgetResultToInsert);
        for (let start = 0; start < rows.length; start += RESULTS_PER_INSERT) {
          await tx
            .insert(schema.budgetResults)
            .values(rows.slice(start, start + RESULTS_PER_INSERT));
        }
      });
      return ok(undefined);
    } catch (cause) {
      process.stderr.write(`[plan-clone-writer] ${String(cause)}\n`);
      return err('plan-clone-write-unavailable');
    }
  },
});
