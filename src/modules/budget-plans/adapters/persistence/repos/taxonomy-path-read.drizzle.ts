// Adapter Drizzle do `TaxonomyPathReadPort` (BGP-TAXONOMY-PATH-READ) — LEITURA read-only do caminho
// da taxonomia a partir da FOLHA (M2 · RN-M2-09/10). Boundary try/catch → Result. Só `bgp_*`
// (ADR-0014); nenhum JOIN cross-módulo.
//
//   SELECT sub.id, cat.id, cc.id, plan.id, plan.program_ref,
//          (sub.active AND cat.active AND cc.active) AS active
//   FROM   bgp_subcategories sub
//   JOIN   bgp_categories    cat  ON cat.id  = sub.category_id
//   JOIN   bgp_cost_centers  cc   ON cc.id   = cat.cost_center_id
//   JOIN   bgp_budget_plans  plan ON plan.id = cc.budget_plan_id
//   WHERE  sub.id = :ref
//
// Os três JOINs são INNER e isso não é descuido: as FKs `bgp_subcategories → bgp_categories →
// bgp_cost_centers → bgp_budget_plans` são todas NOT NULL com ON DELETE CASCADE, então a folha ou
// tem o caminho inteiro ou não existe. Não há estado em que exista subcategoria órfã para um LEFT
// JOIN resgatar.
//
// `active` é o EFETIVO (#454 gap 3): a intenção de cada nó é gravada por nó, e a leitura é que
// deriva a herança. Uma folha ativa sob um centro desativado está morta — e é exatamente o caso do
// M2-10 (ref desativado entre a leitura da tela e o confirm).

import { eq } from 'drizzle-orm';
import process from 'node:process';

import { type Result, ok, err } from '#src/shared/primitives/result.ts';
import type {
  TaxonomyPathReadPort,
  TaxonomyPathRow,
} from '#src/modules/budget-plans/application/ports/taxonomy-path-read.ts';
import type { BudgetPlansReadError } from '#src/modules/budget-plans/application/ports/planned-amounts-read.ts';
import type { BudgetPlansMysqlHandle } from '../drivers/mysql-driver.ts';
import * as schema from '../schemas/mysql.ts';

export const createDrizzleTaxonomyPathReader = (
  handle: BudgetPlansMysqlHandle, // eslint-disable-line @typescript-eslint/prefer-readonly-parameter-types
): TaxonomyPathReadPort => {
  const { db } = handle;

  return {
    findPathBySubcategory: async (
      subcategoryRef: string,
    ): Promise<Result<TaxonomyPathRow | null, BudgetPlansReadError>> => {
      if (subcategoryRef.length === 0) return ok(null);
      try {
        const rows = await db
          .select({
            subcategoryRef: schema.subcategories.id,
            subcategoryActive: schema.subcategories.active,
            categoryRef: schema.categories.id,
            categoryActive: schema.categories.active,
            costCenterRef: schema.costCenters.id,
            costCenterActive: schema.costCenters.active,
            budgetPlanRef: schema.budgetPlans.id,
            programRef: schema.budgetPlans.programRef,
          })
          .from(schema.subcategories)
          .innerJoin(schema.categories, eq(schema.categories.id, schema.subcategories.categoryId))
          .innerJoin(schema.costCenters, eq(schema.costCenters.id, schema.categories.costCenterId))
          .innerJoin(schema.budgetPlans, eq(schema.budgetPlans.id, schema.costCenters.budgetPlanId))
          .where(eq(schema.subcategories.id, subcategoryRef))
          .limit(1);

        const row = rows[0];
        if (row === undefined) return ok(null);

        return ok({
          subcategoryRef: row.subcategoryRef,
          categoryRef: row.categoryRef,
          costCenterRef: row.costCenterRef,
          budgetPlanRef: row.budgetPlanRef,
          programRef: row.programRef,
          active: row.subcategoryActive && row.categoryActive && row.costCenterActive,
        });
      } catch (cause) {
        process.stderr.write(`[budget-plans-read:findPathBySubcategory] ${String(cause)}\n`);
        return err('budget-plans-read-query-failed');
      }
    },
  };
};
