import { and, eq } from 'drizzle-orm';
import process from 'node:process';
import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type { BudgetId } from '#src/modules/budget-plans/domain/shared/budget-id.ts';
import type { BudgetResult } from '#src/modules/budget-plans/domain/budget-result/budget-result.ts';
import type {
  BudgetResultRepository,
  BudgetResultRepositoryError,
} from '#src/modules/budget-plans/domain/budget-result/repository.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';
import { budgetResultToInsert, budgetResultFromRow } from '../mappers/budget-result.mapper.ts';

const safe = async <T>(
  ctx: string,
  op: () => Promise<T>,
): Promise<Result<T, BudgetResultRepositoryError>> => {
  try {
    return ok(await op());
  } catch (cause) {
    process.stderr.write(`[budget-result-repo:${ctx}] ${String(cause)}\n`);
    return err('budget-result-repo-unavailable');
  }
};

export const createDrizzleBudgetResultRepository = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): BudgetResultRepository => {
  const db = handle.db;

  return {
    // Upsert por (budget_id, subcategory_id, month) — #413. ON DUPLICATE KEY UPDATE em vez de
    // SELECT-then-UPDATE-or-INSERT: é atômico (sem janela de corrida entre dois planejadores
    // recalculando o mesmo mês) e permitido pelo ADR-0020 §"Lista normativa". A convenção
    // SELECT-then-* do módulo é do bgp_budget_plans, que reconstrói um agregado inteiro; aqui a
    // escrita é de UMA linha endereçada por chave natural — caso canônico de upsert. O `id` da
    // linha existente é preservado (não está no SET): recalcular não troca a identidade da linha.
    //
    // A releitura depois do upsert NÃO é redundante: no recálculo o id gerado pelo chamador é
    // descartado, e devolver a entrada faria a response anunciar um id inexistente (W2 Blocker-1).
    save: async (
      result: BudgetResult,
    ): Promise<Result<BudgetResult, BudgetResultRepositoryError>> => {
      const row = budgetResultToInsert(result);
      const written = await safe('save', async () => {
        await db
          .insert(schema.budgetResults)
          .values(row)
          .onDuplicateKeyUpdate({ set: { valueCents: row.valueCents, model: row.model } });
      });
      if (!written.ok) return written;

      const persisted = await safe('save:reread', async () =>
        db
          .select()
          .from(schema.budgetResults)
          .where(
            and(
              eq(schema.budgetResults.budgetId, row.budgetId),
              eq(schema.budgetResults.subcategoryId, row.subcategoryId),
              eq(schema.budgetResults.month, row.month),
            ),
          )
          .limit(1),
      );
      if (!persisted.ok) return persisted;

      const found = persisted.value[0];
      if (found === undefined) return err('budget-result-repo-unavailable');

      const mapped = budgetResultFromRow(found);
      return mapped.ok ? mapped : err('budget-result-corrupt');
    },

    // Leitura com ORDER BY id determinístico (paridade com o in-memory na suíte). O mapper blinda
    // cada row; qualquer corrupção -> erro único (não devolve resultado parcial).
    listByBudgetId: async (
      budgetId: BudgetId,
    ): Promise<Result<readonly BudgetResult[], BudgetResultRepositoryError>> => {
      try {
        const rows = await db
          .select()
          .from(schema.budgetResults)
          .where(eq(schema.budgetResults.budgetId, budgetId as unknown as string))
          .orderBy(schema.budgetResults.id);

        const results: BudgetResult[] = [];
        for (const row of rows) {
          const mapped = budgetResultFromRow(row);
          if (!mapped.ok) return err('budget-result-corrupt');
          results.push(mapped.value);
        }
        return ok(results);
      } catch (cause) {
        process.stderr.write(`[budget-result-repo:listByBudgetId] ${String(cause)}\n`);
        return err('budget-result-repo-unavailable');
      }
    },

    // CA4/D2: delete explícito (sem FK cascade). O chamador roda na mesma tx do delete do orçamento.
    deleteByBudgetId: async (budgetId: BudgetId) =>
      safe('deleteByBudgetId', async () => {
        await db
          .delete(schema.budgetResults)
          .where(eq(schema.budgetResults.budgetId, budgetId as unknown as string));
      }),
  };
};
