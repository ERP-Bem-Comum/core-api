import process from 'node:process';
import { ok, err } from '#src/shared/primitives/result.ts';
import type { PlanCloneWriter } from '#src/modules/budget-plans/application/ports/plan-clone-writer.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import {
  insertNewPlanInTx,
  writeTreeInTx,
  insertResultsInTx,
  retryOnceOnDeadlock,
  isPlanVersionDuplicate,
  describeDbError,
} from './plan-writes-in-tx.drizzle.ts';

// #1092 — grava a cópia de um plano numa transação só: cabeçalho + budgets + outbox, árvore de
// custos e lançamentos. Qualquer exceção no meio faz o Drizzle emitir ROLLBACK, e nada da cópia fica
// gravado.
//
// O plano da cópia é sempre NOVO (ids gerados agora), então entra por INSERT puro — sem o
// `SELECT ... FOR UPDATE` do upsert, que segurava gap lock no PK durante toda a cópia (F8).
export const createDrizzlePlanCloneWriter = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): PlanCloneWriter => ({
  write: async ({ plan, events, structure, results }) => {
    try {
      // F3 — deadlock na UNIQUE do plano (duas cópias do mesmo ano + programa): refaz uma vez.
      await retryOnceOnDeadlock(async () =>
        handle.db.transaction(async (tx) => {
          await insertNewPlanInTx(tx, plan, events);
          await writeTreeInTx(tx, structure);
          await insertResultsInTx(tx, results);
        }),
      );
      return ok(undefined);
    } catch (cause) {
      // F3 — outro pedido criou o mesmo (ano, programa, versão) no meio tempo: 409, não 503.
      if (isPlanVersionDuplicate(cause)) return err('budget-plan-already-exists');
      // F5 — sem os parâmetros da query no log.
      process.stderr.write(`[plan-clone-writer] ${describeDbError(cause)}\n`);
      return err('plan-clone-write-unavailable');
    }
  },
});
