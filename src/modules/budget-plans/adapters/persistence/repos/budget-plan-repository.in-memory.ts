import { type Result, ok, err } from '../../../../../shared/primitives/result.ts';
import type { BudgetPlan } from '../../../domain/budget-plan/types.ts';
import type { BudgetPlanId } from '../../../domain/shared/budget-plan-id.ts';
import type {
  BudgetPlanRepository,
  ListBudgetPlansQuery,
  BudgetPlanPage,
} from '../../../domain/budget-plan/repository.ts';
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
): InMemoryBudgetPlanRepositoryHandle => {
  const map = new Map<BudgetPlanId, BudgetPlan>();

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

    save: async (plan, events) => {
      map.set(plan.id, plan);
      if (events.length > 0) {
        const appended = await outbox.append(events);
        if (!appended.ok) return err(appended.error);
      }
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
