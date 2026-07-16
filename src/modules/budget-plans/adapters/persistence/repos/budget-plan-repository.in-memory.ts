import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { BudgetPlan } from '../../../domain/budget-plan/types.ts';
import type { BudgetPlanId } from '../../../domain/shared/budget-plan-id.ts';
import type {
  BudgetPlanRepository,
  BudgetPlanRepositoryError,
  ListBudgetPlansQuery,
  BudgetPlanPage,
} from '../../../domain/budget-plan/repository.ts';
import type { BudgetResultRepository } from '../../../domain/budget-result/repository.ts';
import type { BudgetPlansModuleEvent } from '../../../public-api/events.ts';
import type { OutboxPort } from '../../../application/ports/outbox.ts';
import { InMemoryOutbox } from '../../outbox/outbox.in-memory.ts';

const matchesQuery = (p: BudgetPlan, query: ListBudgetPlansQuery): boolean => {
  if (query.year !== undefined && p.year !== query.year) return false;
  if (query.status !== undefined && p.status !== query.status) return false;
  if (query.programRef !== undefined && String(p.programRef) !== String(query.programRef)) {
    return false;
  }
  if (query.rootsOnly === true && p.parentId !== null) return false;
  return true;
};

export type InMemoryBudgetPlanRepositoryHandle = Readonly<{
  repo: BudgetPlanRepository;
  clear: () => void;
}>;

export const InMemoryBudgetPlanRepository = (
  outbox: OutboxPort = InMemoryOutbox().port,
  // Store de resultados co-localizado: no in-memory a "transação" do removeBudget é save + delete no
  // mesmo tick. Ausente (boot/testes sem lançamentos) -> o delete dos results é no-op.
  budgetResultRepo?: BudgetResultRepository,
): InMemoryBudgetPlanRepositoryHandle => {
  const map = new Map<BudgetPlanId, BudgetPlan>();

  const save = async (
    plan: BudgetPlan,
    events: readonly BudgetPlansModuleEvent[],
  ): Promise<Result<void, BudgetPlanRepositoryError>> => {
    map.set(plan.id, plan);
    if (events.length > 0) {
      const appended = await outbox.append(events);
      if (!appended.ok) return err(appended.error);
    }
    return ok(undefined);
  };

  const repo: BudgetPlanRepository = {
    findById: async (id) => ok(map.get(id) ?? null),

    listChildren: async (parentId) =>
      ok(
        [...map.values()].filter(
          (p) => p.parentId !== null && String(p.parentId) === String(parentId),
        ),
      ),

    // Só a RAIZ (parentId === null) — pós-US4, (year, programRef) é compartilhado pela família.
    findRootByYearAndProgram: async (year, programRef) =>
      ok(
        [...map.values()].find(
          (p) =>
            p.parentId === null && p.year === year && String(p.programRef) === String(programRef),
        ) ?? null,
      ),

    listPaged: async (query): Promise<Result<BudgetPlanPage, never>> => {
      const filtered = [...map.values()]
        .filter((p) => matchesQuery(p, query))
        .toSorted((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
      const offset = (query.page - 1) * query.limit;
      const items = filtered.slice(offset, offset + query.limit);
      return ok({ items, total: filtered.length });
    },

    listApprovedByYear: async (query) =>
      ok(
        [...map.values()]
          .filter(
            (p) =>
              p.status === 'APROVADO' &&
              p.year === query.year &&
              (query.programRef === undefined || String(p.programRef) === String(query.programRef)),
          )
          // ORDER BY id ASC — comparação binária (espelha utf8mb4_bin do MySQL, não localeCompare).
          .toSorted((a, b) =>
            String(a.id) < String(b.id) ? -1 : String(a.id) > String(b.id) ? 1 : 0,
          ),
      ),

    listYears: async () =>
      ok([...new Set([...map.values()].map((p) => p.year))].toSorted((a, b) => a - b)),

    save,

    // Remoção atômica (mesmo tick): persiste o plano-sem-o-budget e, se o save deu certo, apaga os
    // results daquele budgetId no store co-localizado. Espelha a tx única do adapter mysql.
    removeBudget: async (plan, budgetId, events) => {
      const saved = await save(plan, events);
      if (!saved.ok) return saved;
      if (budgetResultRepo !== undefined) {
        const deleted = await budgetResultRepo.deleteByBudgetId(budgetId);
        // Store in-memory nunca falha; mapeia p/ erro de infra do port por completude de tipos.
        if (!deleted.ok) return err('budget-plan-repo-unavailable');
      }
      return ok(undefined);
    },

    // #453 — apaga o plano e os results de cada orçamento dele. Os budgets vêm do store (como o
    // adapter mysql os lê do banco), não de uma cópia recebida de fora: é o que mantém os dois
    // adapters com o mesmo comportamento quando o agregado em mãos está velho.
    remove: async (planId) => {
      const plan = map.get(planId);
      if (plan === undefined) return ok(undefined);
      if (budgetResultRepo !== undefined) {
        for (const budget of plan.budgets) {
          const deleted = await budgetResultRepo.deleteByBudgetId(budget.id);
          // Store in-memory nunca falha; mapeia p/ erro de infra do port por completude de tipos.
          if (!deleted.ok) return err('budget-plan-repo-unavailable');
        }
      }
      map.delete(planId);
      return ok(undefined);
    },
  };

  return {
    repo,
    clear: () => {
      map.clear();
    },
  };
};
